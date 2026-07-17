import express, { Request, Response } from "express";
import { getAllPosts, getPostById, getPostsByAuthor } from "./data.js";

const app = express();
app.use(express.json());

app.get("/api/posts", (req: Request, res: Response) => {
  const { author } = req.query;

  let results = getAllPosts();

  if (typeof author === "string") {
    results = getPostsByAuthor(author);
  }

  res.json({
    data: results,
    total: results.length,
  });
});

app.get("/api/posts/:id", (req: Request, res: Response) => {
  const post = getPostById(Number(req.params.id));
  if (!post) {
    res.status(404).json({ error: "Post not found" });
    return;
  }
  res.json(post);
});

export { app };
export default app;
