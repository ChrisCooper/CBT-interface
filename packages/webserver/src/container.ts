import "reflect-metadata";
import { container } from "tsyringe";
import { Config } from "./config.js";

container.registerSingleton(Config);

export { container };
