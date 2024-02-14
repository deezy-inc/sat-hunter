const handler = {
    get(target, prop) {
        switch (prop) {
            case 'withFallback': {
                return (key, fallback) => {
                    return target[key] || fallback;
                }
            }
            default: {
                if (prop in target) {
                    return target[prop];
                }

                throw new Error(`${prop} must be set`);
            }
        }
    },
};
const env = new Proxy(process.env, handler);

module.exports = { env }