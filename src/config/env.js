import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  BOT_TOKEN: process.env.BOT_TOKEN ?? "",
};
