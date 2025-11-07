export const getFreshnessLabel = (rating: number): string => {
  switch (rating) {
    case 1:
      return 'Aged';
    case 2:
      return 'Poor';
    case 3:
      return 'Okay';
    case 4:
      return 'Fresh';
    case 5:
      return 'Just-Made';
    default:
      return '';
  }
};
