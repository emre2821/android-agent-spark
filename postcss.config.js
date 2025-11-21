const plugins = {
  autoprefixer: {},
};

if (process.env.NODE_ENV !== 'test') {
  plugins.tailwindcss = {};
}

export default {
  plugins,
};
