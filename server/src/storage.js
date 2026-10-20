const fs = require('node:fs/promises');
const path = require('node:path');

function createStorage(filePath) {
  const resolvedPath = path.resolve(filePath);
  let pending = Promise.resolve();

  async function ensureFile() {
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      try {
        await fs.writeFile(resolvedPath, '[]\n', { flag: 'wx' });
      } catch (writeError) {
        if (writeError.code !== 'EEXIST') throw writeError;
      }
    }
  }

  async function read() {
    await ensureFile();
    const contents = await fs.readFile(resolvedPath, 'utf8');
    const links = JSON.parse(contents);
    if (!Array.isArray(links)) throw new Error('Link storage must contain a JSON array');
    return links;
  }

  async function write(links) {
    const temporaryPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(links, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, resolvedPath);
  }

  function serialized(operation) {
    const result = pending.then(operation);
    pending = result.catch(() => {});
    return result;
  }

  return {
    list() {
      return serialized(async () => (await read()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    },
    add(link) {
      return serialized(async () => {
        const links = await read();
        links.push(link);
        await write(links);
        return link;
      });
    },
    incrementClicks(code) {
      return serialized(async () => {
        const links = await read();
        const link = links.find((item) => item.code === code);
        if (!link) return null;
        link.clicks += 1;
        await write(links);
        return link;
      });
    },
    remove(code) {
      return serialized(async () => {
        const links = await read();
        const index = links.findIndex((item) => item.code === code);
        if (index === -1) return null;
        const [link] = links.splice(index, 1);
        await write(links);
        return link;
      });
    }
  };
}

module.exports = { createStorage };
