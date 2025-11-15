export const getRatingLabel = (rating: number): string => {
  switch (rating) {
    case 5:
      return 'Excellent';
    case 4:
      return 'Good';
    case 3:
      return 'Average';
    case 2:
      return 'Poor';
    case 1:
      return 'Very Poor';
    default:
      return 'Rate';
  }
};
