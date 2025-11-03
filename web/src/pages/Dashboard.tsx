import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Agent {
  id: string;
  name: string;
  traits: Record<string, unknown>;
  created_at: string;
}

interface Post {
  id: string;
  theme: string;
  content: Record<string, unknown>;
  created_at: string;
}

export default function Dashboard() {
  const agentsQuery = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const response = await api.get<Agent[]>("/agents");
      return response.data;
    }
  });

  const postsQuery = useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      const response = await api.get<Post[]>("/posts");
      return response.data;
    }
  });

  return (
    <div>
      <section className="card">
        <h2>Agents</h2>
        {agentsQuery.isLoading && <p>Gathering echoes...</p>}
        {agentsQuery.data && (
          <ul>
            {agentsQuery.data.map((agent) => (
              <li key={agent.id}>
                <strong>{agent.name}</strong>
                <pre>{JSON.stringify(agent.traits, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Recent Posts</h2>
        {postsQuery.isLoading && <p>Listening...</p>}
        {postsQuery.data && (
          <ul>
            {postsQuery.data.map((post) => (
              <li key={post.id}>
                <strong>{post.theme}</strong>
                <pre>{JSON.stringify(post.content, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
