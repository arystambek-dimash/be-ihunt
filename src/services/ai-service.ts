import OpenAI from "openai";
import {GoogleGenerativeAI} from '@google/generative-ai';
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config()

const geminiAi = new GoogleGenerativeAI(process.env.GEMINI_AI_API_KEY as string);

const geminiConfig = {
    temperature: 0,
};

export const geminiModel = geminiAi.getGenerativeModel({
    model: "gemini-pro", generationConfig: geminiConfig

});


export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY as string
})


export async function createEmbedding(text: string) {
    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float"
    })
    return embeddingResponse.data[0].embedding
}


export async function findSimilarFromVector(embedding: number[], model: mongoose.Model<any>, k: number = 1) {
    try {
        return await model.aggregate([{
            $search: {
                knnBeta: {
                    vector: embedding,
                    path: 'embedding',
                    k: k
                }
            }
        }]);
    } catch (err) {
        console.log(err);
        throw err;
    }
}