import { describe, expect, it } from "vitest";
import {
  initialTodoState,
  todoReducer,
} from "../src/contexts/TodoContext";
import type { Todo } from "../src/types";

const base: Todo = {
  id: "00000000-0000-0000-0000-000000000001",
  user_id: "user-1",
  title: "First todo",
  description: null,
  due_at: null,
  priority: "medium",
  category_id: null,
  status: "pending",
  linked_event_id: null,
  created_by_ai: false,
  created_at: "2026-04-29T00:00:00.000Z",
  updated_at: "2026-04-29T00:00:00.000Z",
};

describe("todoReducer", () => {
  it("SET_TODOS replaces the todos list", () => {
    const next = todoReducer(initialTodoState, {
      type: "SET_TODOS",
      payload: [base],
    });
    expect(next.todos).toEqual([base]);
    expect(next.loading).toBe(initialTodoState.loading);
    expect(next.error).toBe(initialTodoState.error);
  });

  it("ADD_TODO appends a new todo", () => {
    const next = todoReducer(initialTodoState, {
      type: "ADD_TODO",
      payload: base,
    });
    expect(next.todos).toEqual([base]);
  });

  it("ADD_TODO is a no-op for an existing id (dedupe)", () => {
    const seeded = todoReducer(initialTodoState, {
      type: "ADD_TODO",
      payload: base,
    });
    const next = todoReducer(seeded, { type: "ADD_TODO", payload: base });
    expect(next).toBe(seeded);
  });

  it("UPDATE_TODO replaces the matching todo", () => {
    const seeded = todoReducer(initialTodoState, {
      type: "SET_TODOS",
      payload: [base],
    });
    const renamed: Todo = { ...base, title: "Renamed" };
    const next = todoReducer(seeded, {
      type: "UPDATE_TODO",
      payload: renamed,
    });
    expect(next.todos).toEqual([renamed]);
  });

  it("UPDATE_TODO is a no-op when the id is missing", () => {
    const seeded = todoReducer(initialTodoState, {
      type: "SET_TODOS",
      payload: [base],
    });
    const next = todoReducer(seeded, {
      type: "UPDATE_TODO",
      payload: { ...base, id: "00000000-0000-0000-0000-aaaaaaaaaaaa" },
    });
    expect(next).toBe(seeded);
  });

  it("DELETE_TODO removes a todo by id", () => {
    const second: Todo = {
      ...base,
      id: "00000000-0000-0000-0000-000000000002",
    };
    const seeded = todoReducer(initialTodoState, {
      type: "SET_TODOS",
      payload: [base, second],
    });
    const next = todoReducer(seeded, {
      type: "DELETE_TODO",
      payload: { id: base.id },
    });
    expect(next.todos).toEqual([second]);
  });

  it("DELETE_TODO is a no-op when the id is missing", () => {
    const seeded = todoReducer(initialTodoState, {
      type: "SET_TODOS",
      payload: [base],
    });
    const next = todoReducer(seeded, {
      type: "DELETE_TODO",
      payload: { id: "00000000-0000-0000-0000-aaaaaaaaaaaa" },
    });
    expect(next).toBe(seeded);
  });

  it("SET_LOADING toggles the loading flag", () => {
    const off = todoReducer(initialTodoState, {
      type: "SET_LOADING",
      payload: false,
    });
    expect(off.loading).toBe(false);
    const on = todoReducer(off, { type: "SET_LOADING", payload: true });
    expect(on.loading).toBe(true);
  });

  it("SET_ERROR sets and clears the error", () => {
    const errored = todoReducer(initialTodoState, {
      type: "SET_ERROR",
      payload: "boom",
    });
    expect(errored.error).toBe("boom");
    const cleared = todoReducer(errored, {
      type: "SET_ERROR",
      payload: null,
    });
    expect(cleared.error).toBeNull();
  });
});
