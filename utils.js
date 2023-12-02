export const extractVideoId = (link) => {
  const videoIdRegex = /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([^&?]+)/;
  const match = link.match(videoIdRegex);

  return match ? match[1] : null;
};
