import "reflect-metadata";
import { container } from "tsyringe";
import { Config } from "./config.js";
import { LLM } from "./ai.js";

container.registerSingleton(Config);
container.registerSingleton(LLM);

export { container };
