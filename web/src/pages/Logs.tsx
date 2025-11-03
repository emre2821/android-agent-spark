import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface RitualLog {
  id: string;
  event_type: string;
  emotion?: string;
  context?: string;
  text?: string;
  created_at: string;
}

export default function Logs() {
  const ritualsQuery = useQuery({
    queryKey: ["rituals"],
    queryFn: async () => {
      const response = await api.get<RitualLog[]>("/rituals");
      return response.data;
    }
  });

  return (
    <section className="card">
      <h2>Ritual Logs</h2>
      {ritualsQuery.isLoading && <p>Decoding whispers...</p>}
      {ritualsQuery.data && (
        <ul>
          {ritualsQuery.data.map((log) => (
            <li key={log.id}>
              <strong>{log.event_type}</strong> — {log.emotion ?? "neutral"}
              <div>{log.context}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
