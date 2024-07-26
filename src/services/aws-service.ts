import AWS from 'aws-sdk';
import multer from 'multer';

import conf from "../config/conf";

AWS.config.update({
    accessKeyId: conf.awsAccessKeyId,
    secretAccessKey: conf.awsSecretKey,
    region: conf.awsRegion
});

const storage = multer.memoryStorage();
export const upload = multer({storage: storage});
export const s3 = new AWS.S3();
