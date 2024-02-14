const getVar = (name) => {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} must be set`);
    }

    return value;
}

const getVars = (names) => {
    return names.map(getVar);
}