import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import ytdl from 'ytdl-core'
import { spawn } from 'child_process'
import { mp3Directory, responseMessages } from './config.js'
import { extractVideoId } from './utils.js'
import TelegramBot from 'node-telegram-bot-api'

dotenv.config()

import { connectToDB, saveVideoInfo, findFileUniqueIdByVideoId } from './mongodb.js';
const client = await connectToDB();
const database = client.db(process.env.DB_TABLE);

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true })

bot.on('message', async (msg) => {
  const { text, chat } = msg

  if (text.includes('youtube.com') || text.includes('youtu.be')) {
    const videoId = extractVideoId(text);
    const fileId = await findFileUniqueIdByVideoId(videoId)
    let processingMessage

    if (fileId) {
      processingMessage = await bot.sendMessage(chat.id, responseMessages.moment);

      try {
        await bot.sendAudio(chat.id, fileId);
        bot.deleteMessage(chat.id, processingMessage.message_id);
      } catch (error) {
        await bot.sendMessage(chat.id, responseMessages.error + error);
      }


    return false
    } else {
      processingMessage = await bot.sendMessage(chat.id, responseMessages.processing);
    }
    


    downloadAndConvertToMP3(text)
      .then(async (filePath) => {
        const sendingMessage = await bot.sendMessage(chat.id, responseMessages.sending);
        try {
          // bot.deleteMessage(chat.id, msg.message_id);
          bot.deleteMessage(chat.id, processingMessage.message_id);
  
          let fileInfo = await bot.sendAudio(chat.id, filePath);
          fs.unlink(filePath, () => {})
  
          bot.deleteMessage(chat.id, sendingMessage.message_id);

          saveVideoInfo(videoId, fileInfo.audio.file_id)
        } catch (error) {
          await bot.sendMessage(chat.id, responseMessages.error + error);
        }
      })
      .catch((error) => {
        bot.deleteMessage(chat.id, msg.message_id)
        bot.deleteMessage(chat.id, processingMessage.message_id)
        bot.sendMessage(chat.id, responseMessages.error)
      });
  }
});


const downloadAndConvertToMP3 = (videoURL) => {
  return new Promise(async (resolve, reject) => {
    try {
      const videoInfo = await ytdl.getInfo(videoURL)
      const title = videoInfo.videoDetails.title.replace(/[^\w\s]/gi, '').replace(/\n$/, '')
      const mp3FilePath = path.join(mp3Directory, `${title}.mp3`)
      const videoStream = await ytdl(videoURL, { quality: 'highestaudio' })
      
      const ffmpegProcess = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-b:a', '192K',
        mp3FilePath,
      ])

      videoStream.pipe(ffmpegProcess.stdin);


      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve(mp3FilePath)
        } else {
          reject(`ffmpeg process exited with code ${code}`)
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};



// сначала пытается отправить аудио, ошибка и потом прилетает что сконвертировано успшно