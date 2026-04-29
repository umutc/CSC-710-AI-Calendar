import { useContext } from "react";
import { TodoContext } from "../contexts/TodoContext";

export function useTodos() {
  const ctx = useContext(TodoContext);
  if (!ctx) {
    throw new Error("useTodos must be used inside <TodoProvider>");
  }
  return ctx;
}
