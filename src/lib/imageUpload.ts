import { toast } from "sonner";
import { supabase } from "./supabase";

export async function uploadTodoImage(file: File, userId: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("todo-attachments")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    toast.error(`Image upload failed: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from("todo-attachments").getPublicUrl(path);
  return data?.publicUrl ?? null;
}
