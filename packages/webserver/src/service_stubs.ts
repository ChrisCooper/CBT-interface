import { log } from "./logger";

interface CustomerIdVerificationResult {
    isValid: boolean;
    message: string;
}

export const verifyCustomerId = async (customerId: string) => {
    log.info({ customerId }, `Verifying customer ID`);
    
    const isValid = Math.random() < 0.5;

    if (isValid) {
        return {
            isValid: true,
            message: `Customer ID ${customerId} is valid`,
        };
    } else {
        return {
            isValid: false,
            message: `Customer ID ${customerId} wasn't found`,
        };
    }
};

interface CancellationResult {
    isConfirmed: boolean;
    message: string;
}

export const processCancellation = async (customerId: string) => {
  log.info({ customerId }, `Processing cancellation`);

  const isConfirmed = Math.random() < 0.5;

  if (isConfirmed) {
    return {
      isConfirmed: true,
      message: `Cancellation processed for customer ID ${customerId}`,
    };
  } else {
    return {
      isConfirmed: false,
      message: `Cancellation was not processed for customer ID ${customerId}`,
    };
  }
};