import { tool } from "ai";
import {z} from "zod";

// Define a tool to get the current time of server
export const timeTool = tool({
    name: "get_current_time",
    description: "Get the current time in a specified timezone (requires IANA timezone string like 'Asia/Kolkata' for India)",
    inputSchema: z.object({}),
    execute: () => {
        return new Date().toString();
    }
})