import { registerMovementGenerators } from "./movement";
import { registerSensorGenerators } from "./sensors";
import { registerArmGenerators } from "./arm";
import { registerSpeechGenerators } from "./speech";
import { registerLightGenerators } from "./lights";
import { registerWaitGenerators } from "./wait";
import { registerHeadGenerators } from "./head";
import { registerNavigationGenerators } from "./navigation";
import { registerChatGenerators } from "./chat";
import { registerVisionGenerators } from "./vision";

export function registerAllGenerators() {
  registerMovementGenerators();
  registerSensorGenerators();
  registerArmGenerators();
  registerSpeechGenerators();
  registerLightGenerators();
  registerWaitGenerators();
  registerHeadGenerators();
  registerNavigationGenerators();
  registerChatGenerators();
  registerVisionGenerators();
}
