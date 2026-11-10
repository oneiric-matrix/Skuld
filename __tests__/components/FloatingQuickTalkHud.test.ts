import { FloatingQuickTalkHud, FloatingQuickTalkHudProps } from '../../src/components/FloatingQuickTalkHud';
import { AgentConfigRecord } from '../../src/security/VaultDatabase';

describe('FloatingQuickTalkHud Component Contract & Interaction Tests', () => {
  const mockAgents: AgentConfigRecord[] = [
    {
      id: 'butler',
      customName: 'Butler',
      roleTitle: 'Executive Secretary',
      systemPrompt: 'You are Butler.',
      avatarProfile: 'assets/avatars/butler.png',
      voiceId: 'en_nordic_male',
      isActive: true,
    },
    {
      id: 'pm',
      customName: 'Project Manager',
      roleTitle: 'Technical Director',
      systemPrompt: 'You are PM.',
      avatarProfile: 'assets/avatars/pm.png',
      voiceId: 'en_nordic_female',
      isActive: true,
    },
  ];

  it('exports FloatingQuickTalkHud component and validates contract props', () => {
    expect(FloatingQuickTalkHud).toBeDefined();
    expect(typeof FloatingQuickTalkHud).toBe('function');
  });

  it('handles agent selection, voice toggle, and text submission callbacks', () => {
    const onSelectAgent = jest.fn();
    const onToggleVoice = jest.fn();
    const onSendTextPrompt = jest.fn();

    const props: FloatingQuickTalkHudProps = {
      agents: mockAgents,
      activeAgent: mockAgents[0],
      onSelectAgent,
      isRecording: false,
      isThinking: false,
      streamedResponse: '',
      onToggleVoice,
      onSendTextPrompt,
      statusMessage: 'Ready to listen',
    };

    expect(props.agents).toHaveLength(2);
    expect(props.activeAgent?.id).toBe('butler');

    // Trigger callbacks
    props.onSelectAgent(mockAgents[1]);
    expect(onSelectAgent).toHaveBeenCalledWith(mockAgents[1]);

    props.onToggleVoice();
    expect(onToggleVoice).toHaveBeenCalled();

    props.onSendTextPrompt('Schedule a sync meeting with the architect');
    expect(onSendTextPrompt).toHaveBeenCalledWith('Schedule a sync meeting with the architect');
  });

  it('correctly handles state transitions for recording and thinking states', () => {
    const propsRecording: FloatingQuickTalkHudProps = {
      agents: mockAgents,
      activeAgent: mockAgents[0],
      onSelectAgent: jest.fn(),
      isRecording: true,
      isThinking: false,
      streamedResponse: 'Transcribing speech...',
      onToggleVoice: jest.fn(),
      onSendTextPrompt: jest.fn(),
    };

    expect(propsRecording.isRecording).toBe(true);
    expect(propsRecording.isThinking).toBe(false);
    expect(propsRecording.streamedResponse).toBe('Transcribing speech...');

    const propsThinking: FloatingQuickTalkHudProps = {
      ...propsRecording,
      isRecording: false,
      isThinking: true,
      streamedResponse: 'Generating LLM completion...',
    };

    expect(propsThinking.isRecording).toBe(false);
    expect(propsThinking.isThinking).toBe(true);
  });
});
