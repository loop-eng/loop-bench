export interface Post {
  id: number;
  title: string;
  author: string;
  createdAt: string;
  tags: string[];
}

// Generate 50 posts for pagination testing
function generatePosts(count: number): Post[] {
  const authors = ["Alice", "Bob", "Charlie", "Diana", "Eve"];
  const tagPool = ["tech", "design", "backend", "frontend", "devops", "api", "testing"];
  const posts: Post[] = [];

  for (let i = 1; i <= count; i++) {
    const date = new Date(2024, 0, i);
    posts.push({
      id: i,
      title: `Post ${i}: ${i % 2 === 0 ? "Deep Dive" : "Quick Take"} on Topic ${Math.ceil(i / 5)}`,
      author: authors[(i - 1) % authors.length],
      createdAt: date.toISOString(),
      tags: tagPool.filter((_, idx) => (i + idx) % 3 === 0),
    });
  }

  return posts;
}

export const posts: Post[] = generatePosts(50);

export function getAllPosts(): Post[] {
  return [...posts];
}

export function getPostById(id: number): Post | undefined {
  return posts.find((p) => p.id === id);
}

export function getPostsByAuthor(author: string): Post[] {
  return posts.filter((p) => p.author === author);
}
