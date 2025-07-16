export default ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.164:8000';
  
  return {
    ...config,
    extra: {
      apiUrl: apiUrl,
    },
  };
};