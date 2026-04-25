import { log } from "./logger";

const verifyCustomerId = async (customerId: string) => {
    log.info({ customerId }, `Verifying customer ID`);
    return true;
};

const processCancellation = async (customerId: string) => {
  log.info({ customerId }, `Processing cancellation`);
  return true;
};