/**
 * Example: Chat with model selector
 * 
 * Demonstrates using dynamic transport.body to send the current model selection
 * with each request.
 */
import { useState } from "react";
import { useChat } from "../../src/react";

export function App() {
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-4o");

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: {
      api: "http://localhost:3001/api/chat",
      body: () => ({
        model: selectedModel,
      }),
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === "streaming") return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000705", color: "#FFDB6B" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
        
        <h1 style={{ marginBottom: 16 }}> <img
          src="https://www.firmware.ai/api/media/file/dedalus-logo-gold.svg"
          alt="Dedalus Labs"
          style={{ height: 24, paddingRight: 8}}
        />Dedalus Chat Model Select</h1>

        {/* Model Selector */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Model:</span>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ 
                padding: 8, 
                borderRadius: 4, 
                backgroundColor: "#000", 
                color: "#FFDB6B", 
                border: "1px solid #3b3a35" 
              }}
            >
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              <option value="anthropic/claude-sonnet-4-5-20250929">Claude Sonnet 4.5</option>
            </select>
          </label>
        </div>

        {/* Messages */}
        <div style={{
       
          padding: 16,
          minHeight: 300,
          marginBottom: 16,
          backgroundColor: "#000705",
        }}>
         

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 12,
                padding: 8,
                borderRadius: 4,
                backgroundColor: msg.role === "user" ? "#3b3a35" : "#1a1a18",
              }}
            >
              <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
              <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>
                {msg.content as string}
              </p>
            </div>
          ))}

          {status === "streaming" && (
            <p style={{ fontStyle: "italic", opacity: 0.7 }}>Typing...</p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div style={{
            padding: 8,
            marginBottom: 16,
            backgroundColor: "#3b3a35",
            borderRadius: 4,
            color: "#ff6b6b",
            border: "1px solid #ff6b6b",
          }}>
            Error: {error.message}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={status === "streaming"}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #3b3a35",
              backgroundColor: "#000705",
              color: "#FFDB6B",
            }}
          />

          {status === "streaming" ? (
            <button
              type="button"
              onClick={stop}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "#ff6b6b",
                color: "#000705",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "#FFDB6B",
                color: "#000705",
                cursor: input.trim() ? "pointer" : "not-allowed",
                opacity: input.trim() ? 1 : 0.5,
                fontWeight: "bold",
              }}
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

export default App;
