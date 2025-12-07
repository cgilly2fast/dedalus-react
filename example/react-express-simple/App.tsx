/**
 * Example React app using dedalus-react
 *
 * This is a minimal example showing how to use the useChat hook.
 */
import { useState } from "react";
import { useChat } from "../../src/react";

export function App() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, stop } = useChat({
    transport: {
      api: "http://localhost:3001/api/chat",
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
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#000705",
        color: "#FFDB6B",
      }}
    >
      <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
        <h1 style={{ marginBottom: 16 }}> <img
          src="https://www.firmware.ai/api/media/file/dedalus-logo-gold.svg"
          alt="Dedalus Labs"
          style={{ height: 24, paddingRight: 8}}
        />Dedalus Chat</h1>

        {/* Messages */}
        <div
          style={{
            padding: 16,
            minHeight: 300,
            marginBottom: 16,
            backgroundColor: "#000705",
          }}
        >

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: 12,
                padding: 8,
                borderRadius: 4,
                backgroundColor: msg.role === "user" ? "#3b3a35" : "#1a1a18",
                color: "#FFDB6B",
              }}
            >
              <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
              <p style={{ margin: "4px 0 0", color: "#FFDB6B" }}>
                {msg.content as string}
              </p>
            </div>
          ))}

          {status === "streaming" && (
            <p style={{ color: "#FFDB6B", fontStyle: "italic", opacity: 0.7 }}>
              Typing...
            </p>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div
            style={{
              padding: 8,
              marginBottom: 16,
              backgroundColor: "#3b3a35",
              borderRadius: 4,
              color: "#ff6b6b",
              border: "1px solid #ff6b6b",
            }}
          >
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

        {/* Status indicator */}
        <p style={{ marginTop: 16, fontSize: 12, color: "#3b3a35" }}>
          Status: {status}
        </p>
      </div>
    </div>
  );
}

export default App;
