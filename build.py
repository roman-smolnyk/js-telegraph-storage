with open("telegraph.js", encoding="utf-8") as f:
    telegraph = f.read()

with open("ciphers.js", encoding="utf-8") as f:
    ciphers = f.read()

with open("telegraph_storage.js", encoding="utf-8") as f:
    telegraph_storage = f.read()


with open("userscript.js", encoding="utf-8") as f:
    userscript = f.read()


result = "\n\n\n\n\n".join([telegraph, ciphers, telegraph_storage, userscript])

with open("snippet.js", "w", encoding="utf-8") as f:
    f.write(result)
