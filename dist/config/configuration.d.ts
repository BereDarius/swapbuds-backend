declare const _default: () => {
    port: number;
    nodeEnv: string;
    database: {
        url: string;
    };
    jwt: {
        secret: string;
        expiresIn: string;
    };
    cloudinary: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
    };
    redis: {
        url: string;
    };
    cors: {
        origin: string;
        credentials: boolean;
    };
    throttle: {
        ttl: number;
        limit: number;
    };
};
export default _default;
