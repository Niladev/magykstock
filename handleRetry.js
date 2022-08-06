export const handleRetry = (error) => {
  numOfRetries += 1;
  console.log(error);
  return numOfRetries < 3;
};
