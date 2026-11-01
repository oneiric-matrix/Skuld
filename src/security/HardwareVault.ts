import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const VAULT_MASTER_KEY_ALIAS = 'skuld_vault_master_key_v1';
const VAULT_SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes of inactivity

export interface VaultAuthState {
  isUnlocked: boolean;
  unlockedAt: number | null;
  supportedBiometryType: LocalAuthentication.AuthenticationType[];
}

class HardwareVaultManager {
  private activeKeyBytes: Uint8Array | null = null;
  private lastActivityTimestamp: number | null = null;

  /**
   * Checks whether the device hardware supports biometrics (fingerprint/face) or device passcodes.
   */
  async checkBiometricSupport(): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    types: LocalAuthentication.AuthenticationType[];
  }> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return { hasHardware, isEnrolled, types };
  }

  /**
   * Prompts user for biometric/device authentication to unlock the Hardware-Backed Vault.
   */
  async unlockVault(promptMessage = 'Unlock your Skuld Vault'): Promise<boolean> {
    const { isEnrolled } = await this.checkBiometricSupport();

    if (isEnrolled) {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Enter device PIN/Passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      if (!authResult.success) {
        return false;
      }
    }

    // Retrieve or provision hardware-secured master key from Android Keystore / iOS Keychain
    let masterKeyHex = await SecureStore.getItemAsync(VAULT_MASTER_KEY_ALIAS, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    if (!masterKeyHex) {
      // First boot: Generate cryptographically secure 256-bit entropy
      const randomBytes = await Crypto.getRandomBytesAsync(32);
      masterKeyHex = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      await SecureStore.setItemAsync(VAULT_MASTER_KEY_ALIAS, masterKeyHex, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    }

    // Convert hex string into ephemeral Uint8Array stored solely in RAM
    const keyArray = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      keyArray[i] = parseInt(masterKeyHex.substring(i * 2, i * 2 + 2), 16);
    }

    this.activeKeyBytes = keyArray;
    this.lastActivityTimestamp = Date.now();
    return true;
  }

  /**
   * Returns whether the vault is currently unlocked and the active session has not timed out.
   */
  isUnlocked(): boolean {
    if (!this.activeKeyBytes || !this.lastActivityTimestamp) {
      return false;
    }
    const isExpired = Date.now() - this.lastActivityTimestamp > VAULT_SESSION_TIMEOUT_MS;
    if (isExpired) {
      this.lockVault();
      return false;
    }
    return true;
  }

  /**
   * Refreshes the active session timer when user interacts with an agent.
   */
  recordActivity(): void {
    if (this.activeKeyBytes) {
      this.lastActivityTimestamp = Date.now();
    }
  }

  /**
   * Obtains the 256-bit encryption key buffer. Throws if vault is locked.
   */
  getActiveKey(): Uint8Array {
    if (!this.isUnlocked() || !this.activeKeyBytes) {
      throw new Error('Vault is locked. Biometric authentication required.');
    }
    this.recordActivity();
    return this.activeKeyBytes;
  }

  /**
   * Ephemeral memory wipe: zeroes out key buffers in RAM upon lock or session timeout.
   */
  lockVault(): void {
    if (this.activeKeyBytes) {
      this.activeKeyBytes.fill(0);
      this.activeKeyBytes = null;
    }
    this.lastActivityTimestamp = null;
  }
}

export const hardwareVault = new HardwareVaultManager();
