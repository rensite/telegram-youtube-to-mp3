import dotenv from 'dotenv'
import { MongoClient } from 'mongodb';
dotenv.config()
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);


export async function connectToDB() {
  try {
    await client.connect();
    return client;
  } catch (err) {
    return null;
  }
}

export const getClient = async () => {
  return client;
}

export const closeDB = async () => {
  try {
    await client.close();
  } catch (err) {
  }
}

const isVideoIdUnique = async (videoId) => {
  const database = client.db('youtube-mp3');
  const collection = database.collection('videos');

  try {
    const existingVideo = await collection.findOne({ videoId });
    return existingVideo === null; 
  } catch (err) {
    return false; 
  }
}

export const saveVideoInfo = async (videoId, fileUniqueId) => {
  const isUnique = await isVideoIdUnique(videoId);

  if (!isUnique) {
    return null;
  }

  const database = client.db('youtube-mp3');
  const collection = database.collection('videos');

  try {
    const result = await collection.insertOne({ videoId, fileUniqueId });
    return result.insertedId;
  } catch (err) {
    return null;
  }
}

export const findFileUniqueIdByVideoId = async (videoId) => {
  const database = client.db('youtube-mp3'); // Replace with your database name
  const collection = database.collection('videos');

  try {
    const video = await collection.findOne({ videoId });
    if (video) {
      return video.fileUniqueId;
    } else {
      return null;
    }
  } catch (err) {
    return null;
  }
}
