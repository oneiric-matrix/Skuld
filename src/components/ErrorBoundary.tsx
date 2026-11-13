import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Skuld Root ErrorBoundary caught an unhandled exception:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRestart = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>⚡ SKULD SYSTEM RECOVERY</Text>
            <Text style={styles.subtitle}>
              An unhandled exception occurred during application lifecycle execution.
            </Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {this.state.error?.name}: {this.state.error?.message}
              </Text>
              {this.state.error?.stack && (
                <Text style={styles.stackText}>{this.state.error.stack}</Text>
              )}
            </View>

            <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
              <Text style={styles.buttonText}>Restart Kernel</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A12',
  },
  content: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00E5FF',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 14,
    color: '#DCE4EC',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#161622',
    borderColor: '#FF5252',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  errorText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  stackText: {
    color: '#8A99AD',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  button: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  buttonText: {
    color: '#0A0A12',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
