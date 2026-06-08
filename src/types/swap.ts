export type SwapRequest = {
  id: number;
  status: string;
  appliance: {
    applianceType: string;
    brand: string;
    conditionGrade: string;
    uploadedFileName: string | null;
  };
  preValuation: {
    minEstimatedValue: number;
    maxEstimatedValue: number;
    currency: string;
    basis: string[];
  };
  booking: {
    bookingDate: string;
    bookingTime: string;
    address: string;
  } | null;
  tracking: {
    message: string;
    estimatedArrivalAt: string;
  };
  credit: {
    amount: number;
    currency: string;
    status: string;
  } | null;
  recyclingReport: {
    summary: string;
    steps: string[];
  };
};

