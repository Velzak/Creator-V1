import { useEffect, useMemo, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

const defaultSystemPrompt = `You are Creator-V1, a self-contained AI assistant built for this app. Answer clearly, provide actionable code and deployment guidance, and use the built-in local model whenever possible. If the OpenAI fallback is selected, forward the request securely through the serverless function.`;

const modelOptions = [
  { value: 'creator-v1', label: 'Creator-V1 (built-in model)' },
  { value: 'gpt-4o-mini', label: 'OpenAI GPT-4o Mini (fallback)' },
  { value: 'gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo (fallback)' }
];

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: defaultSystemPrompt }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState('creator-v1');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const nextMessages = useMemo(() => messages.filter((message) => message.role !== 'system'), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, model })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Unable to contact AI service');
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.text || 'No response received.'
      };
      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([{ role: 'system', content: defaultSystemPrompt }]);
    setError(null);
    setInput('');
  };

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <p className="eyebrow">Creator-V1 AI</p>
          <h1>Launch Your Own AI Model on Netlify</h1>
        </div>
        <button className="reset-button" onClick={handleReset} type="button">
          Reset Conversation
        </button>
      </header>

      <section className="status-panel">
        <div>
          <strong>Model:</strong>
          <select value={model} onChange={(event) => setModel(event.target.value)}>
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <strong>Deploy:</strong>
          <span>{model === 'creator-v1' ? 'Built-in local AI model' : 'OpenAI fallback via Netlify'}</span>
        </div>
      </section>

      <main className="chat-panel">
        <div className="messages">
          {nextMessages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
              <div className="message-role">{message.role.toUpperCase()}</div>
              <div className="message-content">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="message-role">ASSISTANT</div>
              <div className="message-content">Thinking...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="composer" onSubmit={handleSubmit}>
          <textarea
            rows={4}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask your custom Creator-V1 AI anything about web apps, deployment, or building an AI model."
          />
          <div className="composer-controls">
            {error && <span className="error">{error}</span>}
            <button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </main>

      <footer className="footer">
        <p>By default, the built-in Creator-V1 AI runs locally in Netlify. Use OpenAI fallback only when you want a remote model and set <code>OPENAI_API_KEY</code>.</p>
      </footer>
    </div>
  );
}

export default App;
