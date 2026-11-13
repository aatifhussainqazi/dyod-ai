// server/rag/retrievalService.ts
import fs from "node:fs";
import path from "node:path";

// node_modules/minisearch/dist/es/index.js
var ENTRIES = "ENTRIES";
var KEYS = "KEYS";
var VALUES = "VALUES";
var LEAF = "";
var TreeIterator = class {
  constructor(set, type) {
    const node = set._tree;
    const keys = Array.from(node.keys());
    this.set = set;
    this._type = type;
    this._path = keys.length > 0 ? [{ node, keys }] : [];
  }
  next() {
    const value = this.dive();
    this.backtrack();
    return value;
  }
  dive() {
    if (this._path.length === 0) {
      return { done: true, value: void 0 };
    }
    const { node, keys } = last$1(this._path);
    if (last$1(keys) === LEAF) {
      return { done: false, value: this.result() };
    }
    const child = node.get(last$1(keys));
    this._path.push({ node: child, keys: Array.from(child.keys()) });
    return this.dive();
  }
  backtrack() {
    if (this._path.length === 0) {
      return;
    }
    const keys = last$1(this._path).keys;
    keys.pop();
    if (keys.length > 0) {
      return;
    }
    this._path.pop();
    this.backtrack();
  }
  key() {
    return this.set._prefix + this._path.map(({ keys }) => last$1(keys)).filter((key) => key !== LEAF).join("");
  }
  value() {
    return last$1(this._path).node.get(LEAF);
  }
  result() {
    switch (this._type) {
      case VALUES:
        return this.value();
      case KEYS:
        return this.key();
      default:
        return [this.key(), this.value()];
    }
  }
  [Symbol.iterator]() {
    return this;
  }
};
var last$1 = (array) => {
  return array[array.length - 1];
};
var fuzzySearch = (node, query, maxDistance) => {
  const results = /* @__PURE__ */ new Map();
  if (query === void 0)
    return results;
  const n = query.length + 1;
  const m = n + maxDistance;
  const matrix = new Uint8Array(m * n).fill(maxDistance + 1);
  for (let j = 0; j < n; ++j)
    matrix[j] = j;
  for (let i = 1; i < m; ++i)
    matrix[i * n] = i;
  recurse(node, query, maxDistance, results, matrix, 1, n, "");
  return results;
};
var recurse = (node, query, maxDistance, results, matrix, m, n, prefix) => {
  const offset = m * n;
  key: for (const key of node.keys()) {
    if (key === LEAF) {
      const distance = matrix[offset - 1];
      if (distance <= maxDistance) {
        results.set(prefix, [node.get(key), distance]);
      }
    } else {
      let i = m;
      for (let pos = 0; pos < key.length; ++pos, ++i) {
        const char = key[pos];
        const thisRowOffset = n * i;
        const prevRowOffset = thisRowOffset - n;
        let minDistance = matrix[thisRowOffset];
        const jmin = Math.max(0, i - maxDistance - 1);
        const jmax = Math.min(n - 1, i + maxDistance);
        for (let j = jmin; j < jmax; ++j) {
          const different = char !== query[j];
          const rpl = matrix[prevRowOffset + j] + +different;
          const del = matrix[prevRowOffset + j + 1] + 1;
          const ins = matrix[thisRowOffset + j] + 1;
          const dist = matrix[thisRowOffset + j + 1] = Math.min(rpl, del, ins);
          if (dist < minDistance)
            minDistance = dist;
        }
        if (minDistance > maxDistance) {
          continue key;
        }
      }
      recurse(node.get(key), query, maxDistance, results, matrix, i, n, prefix + key);
    }
  }
};
var SearchableMap = class _SearchableMap {
  /**
   * The constructor is normally called without arguments, creating an empty
   * map. In order to create a {@link SearchableMap} from an iterable or from an
   * object, check {@link SearchableMap.from} and {@link
   * SearchableMap.fromObject}.
   *
   * The constructor arguments are for internal use, when creating derived
   * mutable views of a map at a prefix.
   */
  constructor(tree = /* @__PURE__ */ new Map(), prefix = "") {
    this._size = void 0;
    this._tree = tree;
    this._prefix = prefix;
  }
  /**
   * Creates and returns a mutable view of this {@link SearchableMap},
   * containing only entries that share the given prefix.
   *
   * ### Usage:
   *
   * ```javascript
   * let map = new SearchableMap()
   * map.set("unicorn", 1)
   * map.set("universe", 2)
   * map.set("university", 3)
   * map.set("unique", 4)
   * map.set("hello", 5)
   *
   * let uni = map.atPrefix("uni")
   * uni.get("unique") // => 4
   * uni.get("unicorn") // => 1
   * uni.get("hello") // => undefined
   *
   * let univer = map.atPrefix("univer")
   * univer.get("unique") // => undefined
   * univer.get("universe") // => 2
   * univer.get("university") // => 3
   * ```
   *
   * @param prefix  The prefix
   * @return A {@link SearchableMap} representing a mutable view of the original
   * Map at the given prefix
   */
  atPrefix(prefix) {
    if (!prefix.startsWith(this._prefix)) {
      throw new Error("Mismatched prefix");
    }
    const [node, path2] = trackDown(this._tree, prefix.slice(this._prefix.length));
    if (node === void 0) {
      const [parentNode, key] = last(path2);
      for (const k of parentNode.keys()) {
        if (k !== LEAF && k.startsWith(key)) {
          const node2 = /* @__PURE__ */ new Map();
          node2.set(k.slice(key.length), parentNode.get(k));
          return new _SearchableMap(node2, prefix);
        }
      }
    }
    return new _SearchableMap(node, prefix);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
   */
  clear() {
    this._size = void 0;
    this._tree.clear();
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
   * @param key  Key to delete
   */
  delete(key) {
    this._size = void 0;
    return remove(this._tree, key);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/entries
   * @return An iterator iterating through `[key, value]` entries.
   */
  entries() {
    return new TreeIterator(this, ENTRIES);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/forEach
   * @param fn  Iteration function
   */
  forEach(fn) {
    for (const [key, value] of this) {
      fn(key, value, this);
    }
  }
  /**
   * Returns a Map of all the entries that have a key within the given edit
   * distance from the search key. The keys of the returned Map are the matching
   * keys, while the values are two-element arrays where the first element is
   * the value associated to the key, and the second is the edit distance of the
   * key to the search key.
   *
   * ### Usage:
   *
   * ```javascript
   * let map = new SearchableMap()
   * map.set('hello', 'world')
   * map.set('hell', 'yeah')
   * map.set('ciao', 'mondo')
   *
   * // Get all entries that match the key 'hallo' with a maximum edit distance of 2
   * map.fuzzyGet('hallo', 2)
   * // => Map(2) { 'hello' => ['world', 1], 'hell' => ['yeah', 2] }
   *
   * // In the example, the "hello" key has value "world" and edit distance of 1
   * // (change "e" to "a"), the key "hell" has value "yeah" and edit distance of 2
   * // (change "e" to "a", delete "o")
   * ```
   *
   * @param key  The search key
   * @param maxEditDistance  The maximum edit distance (Levenshtein)
   * @return A Map of the matching keys to their value and edit distance
   */
  fuzzyGet(key, maxEditDistance) {
    return fuzzySearch(this._tree, key, maxEditDistance);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/get
   * @param key  Key to get
   * @return Value associated to the key, or `undefined` if the key is not
   * found.
   */
  get(key) {
    const node = lookup(this._tree, key);
    return node !== void 0 ? node.get(LEAF) : void 0;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/has
   * @param key  Key
   * @return True if the key is in the map, false otherwise
   */
  has(key) {
    const node = lookup(this._tree, key);
    return node !== void 0 && node.has(LEAF);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/keys
   * @return An `Iterable` iterating through keys
   */
  keys() {
    return new TreeIterator(this, KEYS);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/set
   * @param key  Key to set
   * @param value  Value to associate to the key
   * @return The {@link SearchableMap} itself, to allow chaining
   */
  set(key, value) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    node.set(LEAF, value);
    return this;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size
   */
  get size() {
    if (this._size) {
      return this._size;
    }
    this._size = 0;
    const iter = this.entries();
    while (!iter.next().done)
      this._size += 1;
    return this._size;
  }
  /**
   * Updates the value at the given key using the provided function. The function
   * is called with the current value at the key, and its return value is used as
   * the new value to be set.
   *
   * ### Example:
   *
   * ```javascript
   * // Increment the current value by one
   * searchableMap.update('somekey', (currentValue) => currentValue == null ? 0 : currentValue + 1)
   * ```
   *
   * If the value at the given key is or will be an object, it might not require
   * re-assignment. In that case it is better to use `fetch()`, because it is
   * faster.
   *
   * @param key  The key to update
   * @param fn  The function used to compute the new value from the current one
   * @return The {@link SearchableMap} itself, to allow chaining
   */
  update(key, fn) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    node.set(LEAF, fn(node.get(LEAF)));
    return this;
  }
  /**
   * Fetches the value of the given key. If the value does not exist, calls the
   * given function to create a new value, which is inserted at the given key
   * and subsequently returned.
   *
   * ### Example:
   *
   * ```javascript
   * const map = searchableMap.fetch('somekey', () => new Map())
   * map.set('foo', 'bar')
   * ```
   *
   * @param key  The key to update
   * @param initial  A function that creates a new value if the key does not exist
   * @return The existing or new value at the given key
   */
  fetch(key, initial) {
    if (typeof key !== "string") {
      throw new Error("key must be a string");
    }
    this._size = void 0;
    const node = createPath(this._tree, key);
    let value = node.get(LEAF);
    if (value === void 0) {
      node.set(LEAF, value = initial());
    }
    return value;
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/values
   * @return An `Iterable` iterating through values.
   */
  values() {
    return new TreeIterator(this, VALUES);
  }
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/@@iterator
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * Creates a {@link SearchableMap} from an `Iterable` of entries
   *
   * @param entries  Entries to be inserted in the {@link SearchableMap}
   * @return A new {@link SearchableMap} with the given entries
   */
  static from(entries) {
    const tree = new _SearchableMap();
    for (const [key, value] of entries) {
      tree.set(key, value);
    }
    return tree;
  }
  /**
   * Creates a {@link SearchableMap} from the iterable properties of a JavaScript object
   *
   * @param object  Object of entries for the {@link SearchableMap}
   * @return A new {@link SearchableMap} with the given entries
   */
  static fromObject(object) {
    return _SearchableMap.from(Object.entries(object));
  }
};
var trackDown = (tree, key, path2 = []) => {
  if (key.length === 0 || tree == null) {
    return [tree, path2];
  }
  for (const k of tree.keys()) {
    if (k !== LEAF && key.startsWith(k)) {
      path2.push([tree, k]);
      return trackDown(tree.get(k), key.slice(k.length), path2);
    }
  }
  path2.push([tree, key]);
  return trackDown(void 0, "", path2);
};
var lookup = (tree, key) => {
  if (key.length === 0 || tree == null) {
    return tree;
  }
  for (const k of tree.keys()) {
    if (k !== LEAF && key.startsWith(k)) {
      return lookup(tree.get(k), key.slice(k.length));
    }
  }
};
var createPath = (node, key) => {
  const keyLength = key.length;
  outer: for (let pos = 0; node && pos < keyLength; ) {
    for (const k of node.keys()) {
      if (k !== LEAF && key[pos] === k[0]) {
        const len = Math.min(keyLength - pos, k.length);
        let offset = 1;
        while (offset < len && key[pos + offset] === k[offset])
          ++offset;
        const child2 = node.get(k);
        if (offset === k.length) {
          node = child2;
        } else {
          const intermediate = /* @__PURE__ */ new Map();
          intermediate.set(k.slice(offset), child2);
          node.set(key.slice(pos, pos + offset), intermediate);
          node.delete(k);
          node = intermediate;
        }
        pos += offset;
        continue outer;
      }
    }
    const child = /* @__PURE__ */ new Map();
    node.set(key.slice(pos), child);
    return child;
  }
  return node;
};
var remove = (tree, key) => {
  const [node, path2] = trackDown(tree, key);
  if (node === void 0) {
    return;
  }
  node.delete(LEAF);
  if (node.size === 0) {
    cleanup(path2);
  } else if (node.size === 1) {
    const [key2, value] = node.entries().next().value;
    merge(path2, key2, value);
  }
};
var cleanup = (path2) => {
  if (path2.length === 0) {
    return;
  }
  const [node, key] = last(path2);
  node.delete(key);
  if (node.size === 0) {
    cleanup(path2.slice(0, -1));
  } else if (node.size === 1) {
    const [key2, value] = node.entries().next().value;
    if (key2 !== LEAF) {
      merge(path2.slice(0, -1), key2, value);
    }
  }
};
var merge = (path2, key, value) => {
  if (path2.length === 0) {
    return;
  }
  const [node, nodeKey] = last(path2);
  node.set(nodeKey + key, value);
  node.delete(nodeKey);
};
var last = (array) => {
  return array[array.length - 1];
};
var OR = "or";
var AND = "and";
var AND_NOT = "and_not";
var MiniSearch = class _MiniSearch {
  /**
   * @param options  Configuration options
   *
   * ### Examples:
   *
   * ```javascript
   * // Create a search engine that indexes the 'title' and 'text' fields of your
   * // documents:
   * const miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * ```
   *
   * ### ID Field:
   *
   * ```javascript
   * // Your documents are assumed to include a unique 'id' field, but if you want
   * // to use a different field for document identification, you can set the
   * // 'idField' option:
   * const miniSearch = new MiniSearch({ idField: 'key', fields: ['title', 'text'] })
   * ```
   *
   * ### Options and defaults:
   *
   * ```javascript
   * // The full set of options (here with their default value) is:
   * const miniSearch = new MiniSearch({
   *   // idField: field that uniquely identifies a document
   *   idField: 'id',
   *
   *   // extractField: function used to get the value of a field in a document.
   *   // By default, it assumes the document is a flat object with field names as
   *   // property keys and field values as string property values, but custom logic
   *   // can be implemented by setting this option to a custom extractor function.
   *   extractField: (document, fieldName) => document[fieldName],
   *
   *   // tokenize: function used to split fields into individual terms. By
   *   // default, it is also used to tokenize search queries, unless a specific
   *   // `tokenize` search option is supplied. When tokenizing an indexed field,
   *   // the field name is passed as the second argument.
   *   tokenize: (string, _fieldName) => string.split(SPACE_OR_PUNCTUATION),
   *
   *   // processTerm: function used to process each tokenized term before
   *   // indexing. It can be used for stemming and normalization. Return a falsy
   *   // value in order to discard a term. By default, it is also used to process
   *   // search queries, unless a specific `processTerm` option is supplied as a
   *   // search option. When processing a term from a indexed field, the field
   *   // name is passed as the second argument.
   *   processTerm: (term, _fieldName) => term.toLowerCase(),
   *
   *   // searchOptions: default search options, see the `search` method for
   *   // details
   *   searchOptions: undefined,
   *
   *   // fields: document fields to be indexed. Mandatory, but not set by default
   *   fields: undefined
   *
   *   // storeFields: document fields to be stored and returned as part of the
   *   // search results.
   *   storeFields: []
   * })
   * ```
   */
  constructor(options) {
    if ((options === null || options === void 0 ? void 0 : options.fields) == null) {
      throw new Error('MiniSearch: option "fields" must be provided');
    }
    const autoVacuum = options.autoVacuum == null || options.autoVacuum === true ? defaultAutoVacuumOptions : options.autoVacuum;
    this._options = {
      ...defaultOptions,
      ...options,
      autoVacuum,
      searchOptions: { ...defaultSearchOptions, ...options.searchOptions || {} },
      autoSuggestOptions: { ...defaultAutoSuggestOptions, ...options.autoSuggestOptions || {} }
    };
    this._index = new SearchableMap();
    this._documentCount = 0;
    this._documentIds = /* @__PURE__ */ new Map();
    this._idToShortId = /* @__PURE__ */ new Map();
    this._fieldIds = {};
    this._fieldLength = /* @__PURE__ */ new Map();
    this._avgFieldLength = [];
    this._nextId = 0;
    this._storedFields = /* @__PURE__ */ new Map();
    this._dirtCount = 0;
    this._currentVacuum = null;
    this._enqueuedVacuum = null;
    this._enqueuedVacuumConditions = defaultVacuumConditions;
    this.addFields(this._options.fields);
  }
  /**
   * Adds a document to the index
   *
   * @param document  The document to be indexed
   */
  add(document) {
    const { extractField, stringifyField, tokenize, processTerm, fields, idField } = this._options;
    const id = extractField(document, idField);
    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
    }
    if (this._idToShortId.has(id)) {
      throw new Error(`MiniSearch: duplicate ID ${id}`);
    }
    const shortDocumentId = this.addDocumentId(id);
    this.saveStoredFields(shortDocumentId, document);
    for (const field of fields) {
      const fieldValue = extractField(document, field);
      if (fieldValue == null)
        continue;
      const tokens = tokenize(stringifyField(fieldValue, field), field);
      const fieldId = this._fieldIds[field];
      const uniqueTerms = new Set(tokens).size;
      this.addFieldLength(shortDocumentId, fieldId, this._documentCount - 1, uniqueTerms);
      for (const term of tokens) {
        const processedTerm = processTerm(term, field);
        if (Array.isArray(processedTerm)) {
          for (const t of processedTerm) {
            this.addTerm(fieldId, shortDocumentId, t);
          }
        } else if (processedTerm) {
          this.addTerm(fieldId, shortDocumentId, processedTerm);
        }
      }
    }
  }
  /**
   * Adds all the given documents to the index
   *
   * @param documents  An array of documents to be indexed
   */
  addAll(documents) {
    for (const document of documents)
      this.add(document);
  }
  /**
   * Adds all the given documents to the index asynchronously.
   *
   * Returns a promise that resolves (to `undefined`) when the indexing is done.
   * This method is useful when index many documents, to avoid blocking the main
   * thread. The indexing is performed asynchronously and in chunks.
   *
   * @param documents  An array of documents to be indexed
   * @param options  Configuration options
   * @return A promise resolving to `undefined` when the indexing is done
   */
  addAllAsync(documents, options = {}) {
    const { chunkSize = 10 } = options;
    const acc = { chunk: [], promise: Promise.resolve() };
    const { chunk, promise } = documents.reduce(({ chunk: chunk2, promise: promise2 }, document, i) => {
      chunk2.push(document);
      if ((i + 1) % chunkSize === 0) {
        return {
          chunk: [],
          promise: promise2.then(() => new Promise((resolve) => setTimeout(resolve, 0))).then(() => this.addAll(chunk2))
        };
      } else {
        return { chunk: chunk2, promise: promise2 };
      }
    }, acc);
    return promise.then(() => this.addAll(chunk));
  }
  /**
   * Removes the given document from the index.
   *
   * The document to remove must NOT have changed between indexing and removal,
   * otherwise the index will be corrupted.
   *
   * This method requires passing the full document to be removed (not just the
   * ID), and immediately removes the document from the inverted index, allowing
   * memory to be released. A convenient alternative is {@link
   * MiniSearch#discard}, which needs only the document ID, and has the same
   * visible effect, but delays cleaning up the index until the next vacuuming.
   *
   * @param document  The document to be removed
   */
  remove(document) {
    const { tokenize, processTerm, extractField, stringifyField, fields, idField } = this._options;
    const id = extractField(document, idField);
    if (id == null) {
      throw new Error(`MiniSearch: document does not have ID field "${idField}"`);
    }
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      throw new Error(`MiniSearch: cannot remove document with ID ${id}: it is not in the index`);
    }
    for (const field of fields) {
      const fieldValue = extractField(document, field);
      if (fieldValue == null)
        continue;
      const tokens = tokenize(stringifyField(fieldValue, field), field);
      const fieldId = this._fieldIds[field];
      const uniqueTerms = new Set(tokens).size;
      this.removeFieldLength(shortId, fieldId, this._documentCount, uniqueTerms);
      for (const term of tokens) {
        const processedTerm = processTerm(term, field);
        if (Array.isArray(processedTerm)) {
          for (const t of processedTerm) {
            this.removeTerm(fieldId, shortId, t);
          }
        } else if (processedTerm) {
          this.removeTerm(fieldId, shortId, processedTerm);
        }
      }
    }
    this._storedFields.delete(shortId);
    this._documentIds.delete(shortId);
    this._idToShortId.delete(id);
    this._fieldLength.delete(shortId);
    this._documentCount -= 1;
  }
  /**
   * Removes all the given documents from the index. If called with no arguments,
   * it removes _all_ documents from the index.
   *
   * @param documents  The documents to be removed. If this argument is omitted,
   * all documents are removed. Note that, for removing all documents, it is
   * more efficient to call this method with no arguments than to pass all
   * documents.
   */
  removeAll(documents) {
    if (documents) {
      for (const document of documents)
        this.remove(document);
    } else if (arguments.length > 0) {
      throw new Error("Expected documents to be present. Omit the argument to remove all documents.");
    } else {
      this._index = new SearchableMap();
      this._documentCount = 0;
      this._documentIds = /* @__PURE__ */ new Map();
      this._idToShortId = /* @__PURE__ */ new Map();
      this._fieldLength = /* @__PURE__ */ new Map();
      this._avgFieldLength = [];
      this._storedFields = /* @__PURE__ */ new Map();
      this._nextId = 0;
    }
  }
  /**
   * Discards the document with the given ID, so it won't appear in search results
   *
   * It has the same visible effect of {@link MiniSearch.remove} (both cause the
   * document to stop appearing in searches), but a different effect on the
   * internal data structures:
   *
   *   - {@link MiniSearch#remove} requires passing the full document to be
   *   removed as argument, and removes it from the inverted index immediately.
   *
   *   - {@link MiniSearch#discard} instead only needs the document ID, and
   *   works by marking the current version of the document as discarded, so it
   *   is immediately ignored by searches. This is faster and more convenient
   *   than {@link MiniSearch#remove}, but the index is not immediately
   *   modified. To take care of that, vacuuming is performed after a certain
   *   number of documents are discarded, cleaning up the index and allowing
   *   memory to be released.
   *
   * After discarding a document, it is possible to re-add a new version, and
   * only the new version will appear in searches. In other words, discarding
   * and re-adding a document works exactly like removing and re-adding it. The
   * {@link MiniSearch.replace} method can also be used to replace a document
   * with a new version.
   *
   * #### Details about vacuuming
   *
   * Repetite calls to this method would leave obsolete document references in
   * the index, invisible to searches. Two mechanisms take care of cleaning up:
   * clean up during search, and vacuuming.
   *
   *   - Upon search, whenever a discarded ID is found (and ignored for the
   *   results), references to the discarded document are removed from the
   *   inverted index entries for the search terms. This ensures that subsequent
   *   searches for the same terms do not need to skip these obsolete references
   *   again.
   *
   *   - In addition, vacuuming is performed automatically by default (see the
   *   `autoVacuum` field in {@link Options}) after a certain number of
   *   documents are discarded. Vacuuming traverses all terms in the index,
   *   cleaning up all references to discarded documents. Vacuuming can also be
   *   triggered manually by calling {@link MiniSearch#vacuum}.
   *
   * @param id  The ID of the document to be discarded
   */
  discard(id) {
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      throw new Error(`MiniSearch: cannot discard document with ID ${id}: it is not in the index`);
    }
    this._idToShortId.delete(id);
    this._documentIds.delete(shortId);
    this._storedFields.delete(shortId);
    (this._fieldLength.get(shortId) || []).forEach((fieldLength, fieldId) => {
      this.removeFieldLength(shortId, fieldId, this._documentCount, fieldLength);
    });
    this._fieldLength.delete(shortId);
    this._documentCount -= 1;
    this._dirtCount += 1;
    this.maybeAutoVacuum();
  }
  maybeAutoVacuum() {
    if (this._options.autoVacuum === false) {
      return;
    }
    const { minDirtFactor, minDirtCount, batchSize, batchWait } = this._options.autoVacuum;
    this.conditionalVacuum({ batchSize, batchWait }, { minDirtCount, minDirtFactor });
  }
  /**
   * Discards the documents with the given IDs, so they won't appear in search
   * results
   *
   * It is equivalent to calling {@link MiniSearch#discard} for all the given
   * IDs, but with the optimization of triggering at most one automatic
   * vacuuming at the end.
   *
   * Note: to remove all documents from the index, it is faster and more
   * convenient to call {@link MiniSearch.removeAll} with no argument, instead
   * of passing all IDs to this method.
   */
  discardAll(ids) {
    const autoVacuum = this._options.autoVacuum;
    try {
      this._options.autoVacuum = false;
      for (const id of ids) {
        this.discard(id);
      }
    } finally {
      this._options.autoVacuum = autoVacuum;
    }
    this.maybeAutoVacuum();
  }
  /**
   * It replaces an existing document with the given updated version
   *
   * It works by discarding the current version and adding the updated one, so
   * it is functionally equivalent to calling {@link MiniSearch#discard}
   * followed by {@link MiniSearch#add}. The ID of the updated document should
   * be the same as the original one.
   *
   * Since it uses {@link MiniSearch#discard} internally, this method relies on
   * vacuuming to clean up obsolete document references from the index, allowing
   * memory to be released (see {@link MiniSearch#discard}).
   *
   * @param updatedDocument  The updated document to replace the old version
   * with
   */
  replace(updatedDocument) {
    const { idField, extractField } = this._options;
    const id = extractField(updatedDocument, idField);
    this.discard(id);
    this.add(updatedDocument);
  }
  /**
   * Triggers a manual vacuuming, cleaning up references to discarded documents
   * from the inverted index
   *
   * Vacuuming is only useful for applications that use the {@link
   * MiniSearch#discard} or {@link MiniSearch#replace} methods.
   *
   * By default, vacuuming is performed automatically when needed (controlled by
   * the `autoVacuum` field in {@link Options}), so there is usually no need to
   * call this method, unless one wants to make sure to perform vacuuming at a
   * specific moment.
   *
   * Vacuuming traverses all terms in the inverted index in batches, and cleans
   * up references to discarded documents from the posting list, allowing memory
   * to be released.
   *
   * The method takes an optional object as argument with the following keys:
   *
   *   - `batchSize`: the size of each batch (1000 by default)
   *
   *   - `batchWait`: the number of milliseconds to wait between batches (10 by
   *   default)
   *
   * On large indexes, vacuuming could have a non-negligible cost: batching
   * avoids blocking the thread for long, diluting this cost so that it is not
   * negatively affecting the application. Nonetheless, this method should only
   * be called when necessary, and relying on automatic vacuuming is usually
   * better.
   *
   * It returns a promise that resolves (to undefined) when the clean up is
   * completed. If vacuuming is already ongoing at the time this method is
   * called, a new one is enqueued immediately after the ongoing one, and a
   * corresponding promise is returned. However, no more than one vacuuming is
   * enqueued on top of the ongoing one, even if this method is called more
   * times (enqueuing multiple ones would be useless).
   *
   * @param options  Configuration options for the batch size and delay. See
   * {@link VacuumOptions}.
   */
  vacuum(options = {}) {
    return this.conditionalVacuum(options);
  }
  conditionalVacuum(options, conditions) {
    if (this._currentVacuum) {
      this._enqueuedVacuumConditions = this._enqueuedVacuumConditions && conditions;
      if (this._enqueuedVacuum != null) {
        return this._enqueuedVacuum;
      }
      this._enqueuedVacuum = this._currentVacuum.then(() => {
        const conditions2 = this._enqueuedVacuumConditions;
        this._enqueuedVacuumConditions = defaultVacuumConditions;
        return this.performVacuuming(options, conditions2);
      });
      return this._enqueuedVacuum;
    }
    if (this.vacuumConditionsMet(conditions) === false) {
      return Promise.resolve();
    }
    this._currentVacuum = this.performVacuuming(options);
    return this._currentVacuum;
  }
  async performVacuuming(options, conditions) {
    const initialDirtCount = this._dirtCount;
    if (this.vacuumConditionsMet(conditions)) {
      const batchSize = options.batchSize || defaultVacuumOptions.batchSize;
      const batchWait = options.batchWait || defaultVacuumOptions.batchWait;
      let i = 1;
      for (const [term, fieldsData] of this._index) {
        for (const [fieldId, fieldIndex] of fieldsData) {
          for (const [shortId] of fieldIndex) {
            if (this._documentIds.has(shortId)) {
              continue;
            }
            if (fieldIndex.size <= 1) {
              fieldsData.delete(fieldId);
            } else {
              fieldIndex.delete(shortId);
            }
          }
        }
        if (this._index.get(term).size === 0) {
          this._index.delete(term);
        }
        if (i % batchSize === 0) {
          await new Promise((resolve) => setTimeout(resolve, batchWait));
        }
        i += 1;
      }
      this._dirtCount -= initialDirtCount;
    }
    await null;
    this._currentVacuum = this._enqueuedVacuum;
    this._enqueuedVacuum = null;
  }
  vacuumConditionsMet(conditions) {
    if (conditions == null) {
      return true;
    }
    let { minDirtCount, minDirtFactor } = conditions;
    minDirtCount = minDirtCount || defaultAutoVacuumOptions.minDirtCount;
    minDirtFactor = minDirtFactor || defaultAutoVacuumOptions.minDirtFactor;
    return this.dirtCount >= minDirtCount && this.dirtFactor >= minDirtFactor;
  }
  /**
   * Is `true` if a vacuuming operation is ongoing, `false` otherwise
   */
  get isVacuuming() {
    return this._currentVacuum != null;
  }
  /**
   * The number of documents discarded since the most recent vacuuming
   */
  get dirtCount() {
    return this._dirtCount;
  }
  /**
   * A number between 0 and 1 giving an indication about the proportion of
   * documents that are discarded, and can therefore be cleaned up by vacuuming.
   * A value close to 0 means that the index is relatively clean, while a higher
   * value means that the index is relatively dirty, and vacuuming could release
   * memory.
   */
  get dirtFactor() {
    return this._dirtCount / (1 + this._documentCount + this._dirtCount);
  }
  /**
   * Returns `true` if a document with the given ID is present in the index and
   * available for search, `false` otherwise
   *
   * @param id  The document ID
   */
  has(id) {
    return this._idToShortId.has(id);
  }
  /**
   * Returns the stored fields (as configured in the `storeFields` constructor
   * option) for the given document ID. Returns `undefined` if the document is
   * not present in the index.
   *
   * @param id  The document ID
   */
  getStoredFields(id) {
    const shortId = this._idToShortId.get(id);
    if (shortId == null) {
      return void 0;
    }
    return this._storedFields.get(shortId);
  }
  /**
   * Search for documents matching the given search query.
   *
   * The result is a list of scored document IDs matching the query, sorted by
   * descending score, and each including data about which terms were matched and
   * in which fields.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Search for "zen art motorcycle" with default options: terms have to match
   * // exactly, and individual terms are joined with OR
   * miniSearch.search('zen art motorcycle')
   * // => [ { id: 2, score: 2.77258, match: { ... } }, { id: 4, score: 1.38629, match: { ... } } ]
   * ```
   *
   * ### Restrict search to specific fields:
   *
   * ```javascript
   * // Search only in the 'title' field
   * miniSearch.search('zen', { fields: ['title'] })
   * ```
   *
   * ### Field boosting:
   *
   * ```javascript
   * // Boost a field
   * miniSearch.search('zen', { boost: { title: 2 } })
   * ```
   *
   * ### Prefix search:
   *
   * ```javascript
   * // Search for "moto" with prefix search (it will match documents
   * // containing terms that start with "moto" or "neuro")
   * miniSearch.search('moto neuro', { prefix: true })
   * ```
   *
   * ### Fuzzy search:
   *
   * ```javascript
   * // Search for "ismael" with fuzzy search (it will match documents containing
   * // terms similar to "ismael", with a maximum edit distance of 0.2 term.length
   * // (rounded to nearest integer)
   * miniSearch.search('ismael', { fuzzy: 0.2 })
   * ```
   *
   * ### Combining strategies:
   *
   * ```javascript
   * // Mix of exact match, prefix search, and fuzzy search
   * miniSearch.search('ismael mob', {
   *  prefix: true,
   *  fuzzy: 0.2
   * })
   * ```
   *
   * ### Advanced prefix and fuzzy search:
   *
   * ```javascript
   * // Perform fuzzy and prefix search depending on the search term. Here
   * // performing prefix and fuzzy search only on terms longer than 3 characters
   * miniSearch.search('ismael mob', {
   *  prefix: term => term.length > 3
   *  fuzzy: term => term.length > 3 ? 0.2 : null
   * })
   * ```
   *
   * ### Combine with AND:
   *
   * ```javascript
   * // Combine search terms with AND (to match only documents that contain both
   * // "motorcycle" and "art")
   * miniSearch.search('motorcycle art', { combineWith: 'AND' })
   * ```
   *
   * ### Combine with AND_NOT:
   *
   * There is also an AND_NOT combinator, that finds documents that match the
   * first term, but do not match any of the other terms. This combinator is
   * rarely useful with simple queries, and is meant to be used with advanced
   * query combinations (see later for more details).
   *
   * ### Filtering results:
   *
   * ```javascript
   * // Filter only results in the 'fiction' category (assuming that 'category'
   * // is a stored field)
   * miniSearch.search('motorcycle art', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * ```
   *
   * ### Wildcard query
   *
   * Searching for an empty string (assuming the default tokenizer) returns no
   * results. Sometimes though, one needs to match all documents, like in a
   * "wildcard" search. This is possible by passing the special value
   * {@link MiniSearch.wildcard} as the query:
   *
   * ```javascript
   * // Return search results for all documents
   * miniSearch.search(MiniSearch.wildcard)
   * ```
   *
   * Note that search options such as `filter` and `boostDocument` are still
   * applied, influencing which results are returned, and their order:
   *
   * ```javascript
   * // Return search results for all documents in the 'fiction' category
   * miniSearch.search(MiniSearch.wildcard, {
   *   filter: (result) => result.category === 'fiction'
   * })
   * ```
   *
   * ### Advanced combination of queries:
   *
   * It is possible to combine different subqueries with OR, AND, and AND_NOT,
   * and even with different search options, by passing a query expression
   * tree object as the first argument, instead of a string.
   *
   * ```javascript
   * // Search for documents that contain "zen" and ("motorcycle" or "archery")
   * miniSearch.search({
   *   combineWith: 'AND',
   *   queries: [
   *     'zen',
   *     {
   *       combineWith: 'OR',
   *       queries: ['motorcycle', 'archery']
   *     }
   *   ]
   * })
   *
   * // Search for documents that contain ("apple" or "pear") but not "juice" and
   * // not "tree"
   * miniSearch.search({
   *   combineWith: 'AND_NOT',
   *   queries: [
   *     {
   *       combineWith: 'OR',
   *       queries: ['apple', 'pear']
   *     },
   *     'juice',
   *     'tree'
   *   ]
   * })
   * ```
   *
   * Each node in the expression tree can be either a string, or an object that
   * supports all {@link SearchOptions} fields, plus a `queries` array field for
   * subqueries.
   *
   * Note that, while this can become complicated to do by hand for complex or
   * deeply nested queries, it provides a formalized expression tree API for
   * external libraries that implement a parser for custom query languages.
   *
   * @param query  Search query
   * @param searchOptions  Search options. Each option, if not given, defaults to the corresponding value of `searchOptions` given to the constructor, or to the library default.
   */
  search(query, searchOptions = {}) {
    const { searchOptions: globalSearchOptions } = this._options;
    const searchOptionsWithDefaults = { ...globalSearchOptions, ...searchOptions };
    const rawResults = this.executeQuery(query, searchOptions);
    const results = [];
    for (const [docId, { score, terms, match }] of rawResults) {
      const quality = terms.length || 1;
      const result = {
        id: this._documentIds.get(docId),
        score: score * quality,
        terms: Object.keys(match),
        queryTerms: terms,
        match
      };
      Object.assign(result, this._storedFields.get(docId));
      if (searchOptionsWithDefaults.filter == null || searchOptionsWithDefaults.filter(result)) {
        results.push(result);
      }
    }
    if (query === _MiniSearch.wildcard && searchOptionsWithDefaults.boostDocument == null) {
      return results;
    }
    results.sort(byScore);
    return results;
  }
  /**
   * Provide suggestions for the given search query
   *
   * The result is a list of suggested modified search queries, derived from the
   * given search query, each with a relevance score, sorted by descending score.
   *
   * By default, it uses the same options used for search, except that by
   * default it performs prefix search on the last term of the query, and
   * combine terms with `'AND'` (requiring all query terms to match). Custom
   * options can be passed as a second argument. Defaults can be changed upon
   * calling the {@link MiniSearch} constructor, by passing a
   * `autoSuggestOptions` option.
   *
   * ### Basic usage:
   *
   * ```javascript
   * // Get suggestions for 'neuro':
   * miniSearch.autoSuggest('neuro')
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 0.46240 } ]
   * ```
   *
   * ### Multiple words:
   *
   * ```javascript
   * // Get suggestions for 'zen ar':
   * miniSearch.autoSuggest('zen ar')
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * ### Fuzzy suggestions:
   *
   * ```javascript
   * // Correct spelling mistakes using fuzzy search:
   * miniSearch.autoSuggest('neromancer', { fuzzy: 0.2 })
   * // => [ { suggestion: 'neuromancer', terms: [ 'neuromancer' ], score: 1.03998 } ]
   * ```
   *
   * ### Filtering:
   *
   * ```javascript
   * // Get suggestions for 'zen ar', but only within the 'fiction' category
   * // (assuming that 'category' is a stored field):
   * miniSearch.autoSuggest('zen ar', {
   *   filter: (result) => result.category === 'fiction'
   * })
   * // => [
   * //  { suggestion: 'zen archery art', terms: [ 'zen', 'archery', 'art' ], score: 1.73332 },
   * //  { suggestion: 'zen art', terms: [ 'zen', 'art' ], score: 1.21313 }
   * // ]
   * ```
   *
   * @param queryString  Query string to be expanded into suggestions
   * @param options  Search options. The supported options and default values
   * are the same as for the {@link MiniSearch#search} method, except that by
   * default prefix search is performed on the last term in the query, and terms
   * are combined with `'AND'`.
   * @return  A sorted array of suggestions sorted by relevance score.
   */
  autoSuggest(queryString, options = {}) {
    options = { ...this._options.autoSuggestOptions, ...options };
    const suggestions = /* @__PURE__ */ new Map();
    for (const { score, terms } of this.search(queryString, options)) {
      const phrase = terms.join(" ");
      const suggestion = suggestions.get(phrase);
      if (suggestion != null) {
        suggestion.score += score;
        suggestion.count += 1;
      } else {
        suggestions.set(phrase, { score, terms, count: 1 });
      }
    }
    const results = [];
    for (const [suggestion, { score, terms, count }] of suggestions) {
      results.push({ suggestion, terms, score: score / count });
    }
    results.sort(byScore);
    return results;
  }
  /**
   * Total number of documents available to search
   */
  get documentCount() {
    return this._documentCount;
  }
  /**
   * Number of terms in the index
   */
  get termCount() {
    return this._index.size;
  }
  /**
   * Deserializes a JSON index (serialized with `JSON.stringify(miniSearch)`)
   * and instantiates a MiniSearch instance. It should be given the same options
   * originally used when serializing the index.
   *
   * ### Usage:
   *
   * ```javascript
   * // If the index was serialized with:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   *
   * const json = JSON.stringify(miniSearch)
   * // It can later be deserialized like this:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @param json  JSON-serialized index
   * @param options  configuration options, same as the constructor
   * @return An instance of MiniSearch deserialized from the given JSON.
   */
  static loadJSON(json, options) {
    if (options == null) {
      throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
    }
    return this.loadJS(JSON.parse(json), options);
  }
  /**
   * Async equivalent of {@link MiniSearch.loadJSON}
   *
   * This function is an alternative to {@link MiniSearch.loadJSON} that returns
   * a promise, and loads the index in batches, leaving pauses between them to avoid
   * blocking the main thread. It tends to be slower than the synchronous
   * version, but does not block the main thread, so it can be a better choice
   * when deserializing very large indexes.
   *
   * @param json  JSON-serialized index
   * @param options  configuration options, same as the constructor
   * @return A Promise that will resolve to an instance of MiniSearch deserialized from the given JSON.
   */
  static async loadJSONAsync(json, options) {
    if (options == null) {
      throw new Error("MiniSearch: loadJSON should be given the same options used when serializing the index");
    }
    return this.loadJSAsync(JSON.parse(json), options);
  }
  /**
   * Returns the default value of an option. It will throw an error if no option
   * with the given name exists.
   *
   * @param optionName  Name of the option
   * @return The default value of the given option
   *
   * ### Usage:
   *
   * ```javascript
   * // Get default tokenizer
   * MiniSearch.getDefault('tokenize')
   *
   * // Get default term processor
   * MiniSearch.getDefault('processTerm')
   *
   * // Unknown options will throw an error
   * MiniSearch.getDefault('notExisting')
   * // => throws 'MiniSearch: unknown option "notExisting"'
   * ```
   */
  static getDefault(optionName) {
    if (defaultOptions.hasOwnProperty(optionName)) {
      return getOwnProperty(defaultOptions, optionName);
    } else {
      throw new Error(`MiniSearch: unknown option "${optionName}"`);
    }
  }
  /**
   * @ignore
   */
  static loadJS(js, options) {
    const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
    const miniSearch = this.instantiateMiniSearch(js, options);
    miniSearch._documentIds = objectToNumericMap(documentIds);
    miniSearch._fieldLength = objectToNumericMap(fieldLength);
    miniSearch._storedFields = objectToNumericMap(storedFields);
    for (const [shortId, id] of miniSearch._documentIds) {
      miniSearch._idToShortId.set(id, shortId);
    }
    for (const [term, data] of index) {
      const dataMap = /* @__PURE__ */ new Map();
      for (const fieldId of Object.keys(data)) {
        let indexEntry = data[fieldId];
        if (serializationVersion === 1) {
          indexEntry = indexEntry.ds;
        }
        dataMap.set(parseInt(fieldId, 10), objectToNumericMap(indexEntry));
      }
      miniSearch._index.set(term, dataMap);
    }
    return miniSearch;
  }
  /**
   * @ignore
   */
  static async loadJSAsync(js, options) {
    const { index, documentIds, fieldLength, storedFields, serializationVersion } = js;
    const miniSearch = this.instantiateMiniSearch(js, options);
    miniSearch._documentIds = await objectToNumericMapAsync(documentIds);
    miniSearch._fieldLength = await objectToNumericMapAsync(fieldLength);
    miniSearch._storedFields = await objectToNumericMapAsync(storedFields);
    for (const [shortId, id] of miniSearch._documentIds) {
      miniSearch._idToShortId.set(id, shortId);
    }
    let count = 0;
    for (const [term, data] of index) {
      const dataMap = /* @__PURE__ */ new Map();
      for (const fieldId of Object.keys(data)) {
        let indexEntry = data[fieldId];
        if (serializationVersion === 1) {
          indexEntry = indexEntry.ds;
        }
        dataMap.set(parseInt(fieldId, 10), await objectToNumericMapAsync(indexEntry));
      }
      if (++count % 1e3 === 0)
        await wait(0);
      miniSearch._index.set(term, dataMap);
    }
    return miniSearch;
  }
  /**
   * @ignore
   */
  static instantiateMiniSearch(js, options) {
    const { documentCount, nextId, fieldIds, averageFieldLength, dirtCount, serializationVersion } = js;
    if (serializationVersion !== 1 && serializationVersion !== 2) {
      throw new Error("MiniSearch: cannot deserialize an index created with an incompatible version");
    }
    const miniSearch = new _MiniSearch(options);
    miniSearch._documentCount = documentCount;
    miniSearch._nextId = nextId;
    miniSearch._idToShortId = /* @__PURE__ */ new Map();
    miniSearch._fieldIds = fieldIds;
    miniSearch._avgFieldLength = averageFieldLength;
    miniSearch._dirtCount = dirtCount || 0;
    miniSearch._index = new SearchableMap();
    return miniSearch;
  }
  /**
   * @ignore
   */
  executeQuery(query, searchOptions = {}) {
    if (query === _MiniSearch.wildcard) {
      return this.executeWildcardQuery(searchOptions);
    }
    if (typeof query !== "string") {
      const options2 = { ...searchOptions, ...query, queries: void 0 };
      const results2 = query.queries.map((subquery) => this.executeQuery(subquery, options2));
      return this.combineResults(results2, options2.combineWith);
    }
    const { tokenize, processTerm, searchOptions: globalSearchOptions } = this._options;
    const options = { tokenize, processTerm, ...globalSearchOptions, ...searchOptions };
    const { tokenize: searchTokenize, processTerm: searchProcessTerm } = options;
    const terms = searchTokenize(query).flatMap((term) => searchProcessTerm(term)).filter((term) => !!term);
    const queries = terms.map(termToQuerySpec(options));
    const results = queries.map((query2) => this.executeQuerySpec(query2, options));
    return this.combineResults(results, options.combineWith);
  }
  /**
   * @ignore
   */
  executeQuerySpec(query, searchOptions) {
    const options = { ...this._options.searchOptions, ...searchOptions };
    const boosts = (options.fields || this._options.fields).reduce((boosts2, field) => ({ ...boosts2, [field]: getOwnProperty(options.boost, field) || 1 }), {});
    const { boostDocument, weights, maxFuzzy, bm25: bm25params } = options;
    const { fuzzy: fuzzyWeight, prefix: prefixWeight } = { ...defaultSearchOptions.weights, ...weights };
    const data = this._index.get(query.term);
    const results = this.termResults(query.term, query.term, 1, query.termBoost, data, boosts, boostDocument, bm25params);
    let prefixMatches;
    let fuzzyMatches;
    if (query.prefix) {
      prefixMatches = this._index.atPrefix(query.term);
    }
    if (query.fuzzy) {
      const fuzzy = query.fuzzy === true ? 0.2 : query.fuzzy;
      const maxDistance = fuzzy < 1 ? Math.min(maxFuzzy, Math.round(query.term.length * fuzzy)) : fuzzy;
      if (maxDistance)
        fuzzyMatches = this._index.fuzzyGet(query.term, maxDistance);
    }
    if (prefixMatches) {
      for (const [term, data2] of prefixMatches) {
        const distance = term.length - query.term.length;
        if (!distance) {
          continue;
        }
        fuzzyMatches === null || fuzzyMatches === void 0 ? void 0 : fuzzyMatches.delete(term);
        const weight = prefixWeight * term.length / (term.length + 0.3 * distance);
        this.termResults(query.term, term, weight, query.termBoost, data2, boosts, boostDocument, bm25params, results);
      }
    }
    if (fuzzyMatches) {
      for (const term of fuzzyMatches.keys()) {
        const [data2, distance] = fuzzyMatches.get(term);
        if (!distance) {
          continue;
        }
        const weight = fuzzyWeight * term.length / (term.length + distance);
        this.termResults(query.term, term, weight, query.termBoost, data2, boosts, boostDocument, bm25params, results);
      }
    }
    return results;
  }
  /**
   * @ignore
   */
  executeWildcardQuery(searchOptions) {
    const results = /* @__PURE__ */ new Map();
    const options = { ...this._options.searchOptions, ...searchOptions };
    for (const [shortId, id] of this._documentIds) {
      const score = options.boostDocument ? options.boostDocument(id, "", this._storedFields.get(shortId)) : 1;
      results.set(shortId, {
        score,
        terms: [],
        match: {}
      });
    }
    return results;
  }
  /**
   * @ignore
   */
  combineResults(results, combineWith = OR) {
    if (results.length === 0) {
      return /* @__PURE__ */ new Map();
    }
    const operator = combineWith.toLowerCase();
    const combinator = combinators[operator];
    if (!combinator) {
      throw new Error(`Invalid combination operator: ${combineWith}`);
    }
    return results.reduce(combinator) || /* @__PURE__ */ new Map();
  }
  /**
   * Allows serialization of the index to JSON, to possibly store it and later
   * deserialize it with {@link MiniSearch.loadJSON}.
   *
   * Normally one does not directly call this method, but rather call the
   * standard JavaScript `JSON.stringify()` passing the {@link MiniSearch}
   * instance, and JavaScript will internally call this method. Upon
   * deserialization, one must pass to {@link MiniSearch.loadJSON} the same
   * options used to create the original instance that was serialized.
   *
   * ### Usage:
   *
   * ```javascript
   * // Serialize the index:
   * let miniSearch = new MiniSearch({ fields: ['title', 'text'] })
   * miniSearch.addAll(documents)
   * const json = JSON.stringify(miniSearch)
   *
   * // Later, to deserialize it:
   * miniSearch = MiniSearch.loadJSON(json, { fields: ['title', 'text'] })
   * ```
   *
   * @return A plain-object serializable representation of the search index.
   */
  toJSON() {
    const index = [];
    for (const [term, fieldIndex] of this._index) {
      const data = {};
      for (const [fieldId, freqs] of fieldIndex) {
        data[fieldId] = Object.fromEntries(freqs);
      }
      index.push([term, data]);
    }
    return {
      documentCount: this._documentCount,
      nextId: this._nextId,
      documentIds: Object.fromEntries(this._documentIds),
      fieldIds: this._fieldIds,
      fieldLength: Object.fromEntries(this._fieldLength),
      averageFieldLength: this._avgFieldLength,
      storedFields: Object.fromEntries(this._storedFields),
      dirtCount: this._dirtCount,
      index,
      serializationVersion: 2
    };
  }
  /**
   * @ignore
   */
  termResults(sourceTerm, derivedTerm, termWeight, termBoost, fieldTermData, fieldBoosts, boostDocumentFn, bm25params, results = /* @__PURE__ */ new Map()) {
    if (fieldTermData == null)
      return results;
    for (const field of Object.keys(fieldBoosts)) {
      const fieldBoost = fieldBoosts[field];
      const fieldId = this._fieldIds[field];
      const fieldTermFreqs = fieldTermData.get(fieldId);
      if (fieldTermFreqs == null)
        continue;
      let matchingFields = fieldTermFreqs.size;
      const avgFieldLength = this._avgFieldLength[fieldId];
      for (const docId of fieldTermFreqs.keys()) {
        if (!this._documentIds.has(docId)) {
          this.removeTerm(fieldId, docId, derivedTerm);
          matchingFields -= 1;
          continue;
        }
        const docBoost = boostDocumentFn ? boostDocumentFn(this._documentIds.get(docId), derivedTerm, this._storedFields.get(docId)) : 1;
        if (!docBoost)
          continue;
        const termFreq = fieldTermFreqs.get(docId);
        const fieldLength = this._fieldLength.get(docId)[fieldId];
        const rawScore = calcBM25Score(termFreq, matchingFields, this._documentCount, fieldLength, avgFieldLength, bm25params);
        const weightedScore = termWeight * termBoost * fieldBoost * docBoost * rawScore;
        const result = results.get(docId);
        if (result) {
          result.score += weightedScore;
          assignUniqueTerm(result.terms, sourceTerm);
          const match = getOwnProperty(result.match, derivedTerm);
          if (match) {
            match.push(field);
          } else {
            result.match[derivedTerm] = [field];
          }
        } else {
          results.set(docId, {
            score: weightedScore,
            terms: [sourceTerm],
            match: { [derivedTerm]: [field] }
          });
        }
      }
    }
    return results;
  }
  /**
   * @ignore
   */
  addTerm(fieldId, documentId, term) {
    const indexData = this._index.fetch(term, createMap);
    let fieldIndex = indexData.get(fieldId);
    if (fieldIndex == null) {
      fieldIndex = /* @__PURE__ */ new Map();
      fieldIndex.set(documentId, 1);
      indexData.set(fieldId, fieldIndex);
    } else {
      const docs = fieldIndex.get(documentId);
      fieldIndex.set(documentId, (docs || 0) + 1);
    }
  }
  /**
   * @ignore
   */
  removeTerm(fieldId, documentId, term) {
    if (!this._index.has(term)) {
      this.warnDocumentChanged(documentId, fieldId, term);
      return;
    }
    const indexData = this._index.fetch(term, createMap);
    const fieldIndex = indexData.get(fieldId);
    if (fieldIndex == null || fieldIndex.get(documentId) == null) {
      this.warnDocumentChanged(documentId, fieldId, term);
    } else if (fieldIndex.get(documentId) <= 1) {
      if (fieldIndex.size <= 1) {
        indexData.delete(fieldId);
      } else {
        fieldIndex.delete(documentId);
      }
    } else {
      fieldIndex.set(documentId, fieldIndex.get(documentId) - 1);
    }
    if (this._index.get(term).size === 0) {
      this._index.delete(term);
    }
  }
  /**
   * @ignore
   */
  warnDocumentChanged(shortDocumentId, fieldId, term) {
    for (const fieldName of Object.keys(this._fieldIds)) {
      if (this._fieldIds[fieldName] === fieldId) {
        this._options.logger("warn", `MiniSearch: document with ID ${this._documentIds.get(shortDocumentId)} has changed before removal: term "${term}" was not present in field "${fieldName}". Removing a document after it has changed can corrupt the index!`, "version_conflict");
        return;
      }
    }
  }
  /**
   * @ignore
   */
  addDocumentId(documentId) {
    const shortDocumentId = this._nextId;
    this._idToShortId.set(documentId, shortDocumentId);
    this._documentIds.set(shortDocumentId, documentId);
    this._documentCount += 1;
    this._nextId += 1;
    return shortDocumentId;
  }
  /**
   * @ignore
   */
  addFields(fields) {
    for (let i = 0; i < fields.length; i++) {
      this._fieldIds[fields[i]] = i;
    }
  }
  /**
   * @ignore
   */
  addFieldLength(documentId, fieldId, count, length) {
    let fieldLengths = this._fieldLength.get(documentId);
    if (fieldLengths == null)
      this._fieldLength.set(documentId, fieldLengths = []);
    fieldLengths[fieldId] = length;
    const averageFieldLength = this._avgFieldLength[fieldId] || 0;
    const totalFieldLength = averageFieldLength * count + length;
    this._avgFieldLength[fieldId] = totalFieldLength / (count + 1);
  }
  /**
   * @ignore
   */
  removeFieldLength(documentId, fieldId, count, length) {
    if (count === 1) {
      this._avgFieldLength[fieldId] = 0;
      return;
    }
    const totalFieldLength = this._avgFieldLength[fieldId] * count - length;
    this._avgFieldLength[fieldId] = totalFieldLength / (count - 1);
  }
  /**
   * @ignore
   */
  saveStoredFields(documentId, doc) {
    const { storeFields, extractField } = this._options;
    if (storeFields == null || storeFields.length === 0) {
      return;
    }
    let documentFields = this._storedFields.get(documentId);
    if (documentFields == null)
      this._storedFields.set(documentId, documentFields = {});
    for (const fieldName of storeFields) {
      const fieldValue = extractField(doc, fieldName);
      if (fieldValue !== void 0)
        documentFields[fieldName] = fieldValue;
    }
  }
};
MiniSearch.wildcard = /* @__PURE__ */ Symbol("*");
var getOwnProperty = (object, property) => Object.prototype.hasOwnProperty.call(object, property) ? object[property] : void 0;
var combinators = {
  [OR]: (a, b) => {
    for (const docId of b.keys()) {
      const existing = a.get(docId);
      if (existing == null) {
        a.set(docId, b.get(docId));
      } else {
        const { score, terms, match } = b.get(docId);
        existing.score = existing.score + score;
        existing.match = Object.assign(existing.match, match);
        assignUniqueTerms(existing.terms, terms);
      }
    }
    return a;
  },
  [AND]: (a, b) => {
    const combined = /* @__PURE__ */ new Map();
    for (const docId of b.keys()) {
      const existing = a.get(docId);
      if (existing == null)
        continue;
      const { score, terms, match } = b.get(docId);
      assignUniqueTerms(existing.terms, terms);
      combined.set(docId, {
        score: existing.score + score,
        terms: existing.terms,
        match: Object.assign(existing.match, match)
      });
    }
    return combined;
  },
  [AND_NOT]: (a, b) => {
    for (const docId of b.keys())
      a.delete(docId);
    return a;
  }
};
var defaultBM25params = { k: 1.2, b: 0.7, d: 0.5 };
var calcBM25Score = (termFreq, matchingCount, totalCount, fieldLength, avgFieldLength, bm25params) => {
  const { k, b, d } = bm25params;
  const invDocFreq = Math.log(1 + (totalCount - matchingCount + 0.5) / (matchingCount + 0.5));
  return invDocFreq * (d + termFreq * (k + 1) / (termFreq + k * (1 - b + b * fieldLength / avgFieldLength)));
};
var termToQuerySpec = (options) => (term, i, terms) => {
  const fuzzy = typeof options.fuzzy === "function" ? options.fuzzy(term, i, terms) : options.fuzzy || false;
  const prefix = typeof options.prefix === "function" ? options.prefix(term, i, terms) : options.prefix === true;
  const termBoost = typeof options.boostTerm === "function" ? options.boostTerm(term, i, terms) : 1;
  return { term, fuzzy, prefix, termBoost };
};
var defaultOptions = {
  idField: "id",
  extractField: (document, fieldName) => document[fieldName],
  stringifyField: (fieldValue, fieldName) => fieldValue.toString(),
  tokenize: (text) => text.split(SPACE_OR_PUNCTUATION),
  processTerm: (term) => term.toLowerCase(),
  fields: void 0,
  searchOptions: void 0,
  storeFields: [],
  logger: (level, message) => {
    if (typeof (console === null || console === void 0 ? void 0 : console[level]) === "function")
      console[level](message);
  },
  autoVacuum: true
};
var defaultSearchOptions = {
  combineWith: OR,
  prefix: false,
  fuzzy: false,
  maxFuzzy: 6,
  boost: {},
  weights: { fuzzy: 0.45, prefix: 0.375 },
  bm25: defaultBM25params
};
var defaultAutoSuggestOptions = {
  combineWith: AND,
  prefix: (term, i, terms) => i === terms.length - 1
};
var defaultVacuumOptions = { batchSize: 1e3, batchWait: 10 };
var defaultVacuumConditions = { minDirtFactor: 0.1, minDirtCount: 20 };
var defaultAutoVacuumOptions = { ...defaultVacuumOptions, ...defaultVacuumConditions };
var assignUniqueTerm = (target, term) => {
  if (!target.includes(term))
    target.push(term);
};
var assignUniqueTerms = (target, source) => {
  for (const term of source) {
    if (!target.includes(term))
      target.push(term);
  }
};
var byScore = ({ score: a }, { score: b }) => b - a;
var createMap = () => /* @__PURE__ */ new Map();
var objectToNumericMap = (object) => {
  const map = /* @__PURE__ */ new Map();
  for (const key of Object.keys(object)) {
    map.set(parseInt(key, 10), object[key]);
  }
  return map;
};
var objectToNumericMapAsync = async (object) => {
  const map = /* @__PURE__ */ new Map();
  let count = 0;
  for (const key of Object.keys(object)) {
    map.set(parseInt(key, 10), object[key]);
    if (++count % 1e3 === 0) {
      await wait(0);
    }
  }
  return map;
};
var wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var SPACE_OR_PUNCTUATION = /[\n\r\p{Z}\p{P}]+/u;

// knowledge_base/processed/metadata.json
var metadata_default = [
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf",
    originalFilename: "DYOD_Academic_Structure_Curriculum_IUST.pdf",
    title: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    academicYear: "2024-2028",
    sourceType: "pdf",
    verificationStatus: "Approved",
    uploadDate: "2026-11-12",
    version: "1.0",
    pageCount: 32,
    extractionStatus: "success",
    summary: "Official IUST curriculum presentation covering DYOD philosophy, 8 academic baskets, credit categorization, majors, flexibility, and early exit options."
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    originalFilename: "DYOD_Evaluation_Strategy_Term_End_Project.pdf",
    title: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    academicYear: "2025-2026",
    sourceType: "pdf",
    verificationStatus: "Approved",
    uploadDate: "2026-11-12",
    version: "1.0",
    pageCount: 5,
    extractionStatus: "success",
    summary: "Official university rubric and phased evaluation strategy for assessing undergraduate DYOD term-end projects, viva voce, deliverables, and assessment metrics."
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    originalFilename: "DYOD_Project_Detailed_Methodology_Seed_Paper.pdf",
    title: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    academicYear: "2025-2026",
    sourceType: "pdf",
    verificationStatus: "Approved",
    uploadDate: "2026-11-12",
    version: "1.0",
    pageCount: 6,
    extractionStatus: "success",
    summary: "Step-by-step practical methodology for converting campus waste paper into plantable seed paper, pulp preparation, blending, screening, pressing, and drying."
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf",
    originalFilename: "DYOD_Seed_Paper_Presentation_Guide.pdf",
    title: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    academicYear: "2025-2026",
    sourceType: "pdf",
    verificationStatus: "Approved",
    uploadDate: "2026-11-12",
    version: "1.0",
    pageCount: 12,
    extractionStatus: "success",
    summary: "Slide presentation and practical project guide on environmental campus paper recovery, seed integration, and ecological benefits."
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    originalFilename: "DYOD_Seed_Paper_Research_Viva_Compendium.pdf",
    title: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    academicYear: "2025-2026",
    sourceType: "pdf",
    verificationStatus: "Approved",
    uploadDate: "2026-11-12",
    version: "1.0",
    pageCount: 23,
    extractionStatus: "success",
    summary: "Comprehensive scientific and defense handbook detailing paper fiber chemistry, hydrogen bonding, ink toxicity, seed viability, Petri dish germination standards, and viva defenses."
  }
];

// knowledge_base/chunks/chunks.json
var chunks_default = [
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p1-c1",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 1,
    heading: "Design your own degree @IUST",
    text: "Design your own degree @IUST\nMay 29, 2025\n1/32",
    tokenCountEstimate: 12
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p2-c2",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 2,
    heading: "Outline",
    text: "Outline\n1.  Why Design your own degree?\n2.  Academic Structure\n3.  Semester-wise Structure\n4.  Courses and Courses Basket Mapping\n5.  Majors\n6.  Flexibility and Credit categorization\n7.  Early Exit Options\n8.  Misc\n2/32",
    tokenCountEstimate: 55
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p3-c3",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 3,
    heading: "1",
    text: "1\nWhy Design Your Own Degree\n3/32",
    tokenCountEstimate: 9
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p4-c4",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 4,
    heading: "Why Design your own degree?",
    text: "Why Design your own degree?\n\u2022 Customization\n\u2022 Students design their academic journeys based on their interests, aptitudes, and career\naspirations\n\u2022 Break traditional boundaries between subjects\n\u2022 blend arts, sciences, commerce \u2192 well-rounded education, multidisciplinary education.\n\u2022 Pedagogy \u2192 Project based collaborative problem solving\n\u2022 Active learning \u2192 students work on real-world problems to acquire knowledge and skills.\n\u2022 Promote \u2192 critical thinking, analytical skills, deeper understanding of subjects by placing\nstudents in practical situations.\n\u2022 Projects \u2192 interdisciplinary learning, collaboration, creativity, communication skills\n\u2022 Peer learning, understand diverse perspectives, develop team skills.\n4/32",
    tokenCountEstimate: 181
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p5-c5",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 5,
    heading: "Why Design your own degree?",
    text: "Why Design your own degree?\n\u2022 Increased emphasis on internships, projects, and fieldwork\n\u2022 Interdisciplinary and transdisciplinary learning\n\u2022 Skill development \u2192 essential for the future workplace \u2192 critical thinking, digital\nliteracy, leadership\n\u2022 Flexible/Innovative evaluation mechanisms\n\u2022 Integration of Technology \u2192 better learning experiences using online resources,\ndigital collaboration tools, simulation software\n\u2022 Flexibility in duration and exit options \u2192 educational journey is tuned to individual\nstudent needs.\n\u2022 Many similarities between NEP2020 and DYOD\n5/32",
    tokenCountEstimate: 144
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p6-c6",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 6,
    heading: "IUST advantage",
    text: "IUST advantage\n\u2022 Already running many undergraduate courses/integrated Masters courses like\nB.Tech, FYUGP programs, IMBA\n\u2022 Good infrastructural resources in Technology/Engineering/Science\n\u2022 Human resources across multiple domains in science/engineering/humanities\n\u2022 Established and nationally recognised ecosystem of innovation and entrepreneurship\n\u2192 CIED, DIC\n\u2022 Recent increased emphasis on skilling \u2192 Kalam Academy of skilling\n6/32",
    tokenCountEstimate: 109
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p7-c7",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 7,
    heading: "DYOD@IUST - Basic Modalities",
    text: "DYOD@IUST - Basic Modalities\nProgram Implementation Committee\n1.  Dean Academic Affairs (Chairperson)\n2.  Coordinator, Design Innovation Centre, IUST (Member).\n3.  Dr.  Farooq Hussain Bhat (Member)\n4.  Dr.  Ruheela Hassan Sheikh (Member)\n5.  Dr.  Muzafar Rasool (Member)\n6.  Dr.  Mohammad Asif Bashir Naqshbandi (Member)\n7.  Dr.  Asif Ali Banka (Member Secretary)\n7/32",
    tokenCountEstimate: 92
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p8-c8",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 8,
    heading: "DYOD@IUST - Basic Modalities",
    text: "DYOD@IUST - Basic Modalities\nBoard of Studies\n1.  Dean Academic Affairs (Chairperson)\n2.  Coordinator, Design Innovation Centre, IUST (Convener/Member).\n3. Prof. Shobha Bagai , Cluster Innovation Centre, Delhi University (AC Nominee).\n4. Prof. Amit Apte , Chair, Data Science, IISER Pune (AC Nominee).\n5.  Dr.  Farooq Hussain Bhat (VC Nominee)\n6.  Dr.  Ruheela Hassan Sheikh (VC Nominee)\n7.  Dr.  Muzafar Rasool (VC Nominee)\n8.  Dr.  Mohammad Asif Bashir Naqshbandi (VC Nominee)\n9.  Dr.  Asif Ali Banka (VC Nominee)\n10. Co-opted members\nConducted 2 BOS meetings in 2024, in January and October.\n8/32",
    tokenCountEstimate: 150
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p9-c9",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 9,
    heading: "2",
    text: "2\nAcademic Scheme\n9/32",
    tokenCountEstimate: 6
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p10-c10",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 10,
    heading: "Academic Scheme",
    text: "Academic Scheme\n\u2022 The BS program through DYOD is a four year UG program to be coordinated by\nDesign Innovation Centre (DIC@IUST).\n\u2022 Nomenclature: \u2192 BS 1 in a Major discipline \u2192 through DYOD mode.\n\u2022 Duration: 4 years (8 semesters) for BS (Hons / Research) in Regular mode.\n\u2022 Students would Major in a specific domain (ten subject areas have been identified as\nof now)\n\u2022 More than 50% of total credits need to be earned in the Major discipline to\nqualify for BS in the Major discipline.\n\u2022 Semester break-up\nSemester Courses Department\n1,2,3 All domains DIC\n4 Bridge Semester Majoring department\n5,6,7,8 Major Majoring department\n1 The nomenclature is proposed on the recommendations of the Expert Committee to Review the Notification\non the Specification of Degrees and Suggest New Degree Nomenclature(s) formed by UGC 10/32",
    tokenCountEstimate: 206
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p11-c11",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 11,
    heading: "Course Baskets",
    text: "Course Baskets\nBasket\nnumber\nTheme Acronym Basket\ncode\n1. Natural Sciences Includes:   Physical,  Chemical,  and\nBiological Sciences\nNS S\n2. Mathematical Sciences :   Includes  Pure  and  Applied\nMathematics\nMS M\n3. Computing and Data Science :   Includes  Data  Sci-\nence, Computing, Artificial Intelligence\nCDS C\n4. Humanities and Social Sciences :  Includes  Humani-\nties, Arts and Social Sciences\nHSS H\n5. Engineering and Technology ET T\n6. Earth, Environment and Sustainability EES E\n7. Design, Innovation and Business :  Includes  Design,\nCreativity, Innovation and Business Management\nDIB D\n8. Wellness, Health and Personal development :   In-\ncludes  Wellness,  Mental  Health,  Physical  Fitness  and\nNutrition\nWHP W\n11/32",
    tokenCountEstimate: 183
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p12-c12",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 12,
    heading: "3",
    text: "3\nSemester-wise Structure\n12/32",
    tokenCountEstimate: 8
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p13-c13",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 13,
    heading: "Academic Scheme -Semester-I",
    text: "Academic Scheme -Semester-I\nCourse code Course Credits\nDIC101M Joy of Mathematics:  From zero to infinity 3\nDIC101H Inclusive Learning With Liberal Arts 3\nDIC101C Data Science and AI for all 3\nDIC101D Design Thinking 2\nDIC101W Art of effective communication 3\nDIC101S Science as Art of Enquiry 3\nDIC101E Sketch and Build your Prototype 2\nDIC101P Project I 2\n21\n13/32",
    tokenCountEstimate: 92
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p14-c14",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 14,
    heading: "Academic Scheme -Semester-II",
    text: "Academic Scheme -Semester-II\nCourse code Course Credits\nDIC101S Physics as Fun:  Unveiling the Magic I 3\nDIC103M Enjoying Calculus 3\nDIC110H Global Literature 3\nDIC10* Three courses from five baskets:  C,T,E,D,W 8/9\nDIC102P Project II 2\n19/20\n* Choice between baskets, total six baskets covered.  One course offered per basket\n14/32",
    tokenCountEstimate: 83
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p15-c15",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 15,
    heading: "Academic Scheme -Semester-III",
    text: "Academic Scheme -Semester-III\nCourse Credits\nSix courses. 2 At-least 3 baskets to be covered,\nat-most 2 courses per basket enrolled\n17/18\nProject III 3\nTotal 20/21\n2 multiple courses offered within one basket\n15/32",
    tokenCountEstimate: 54
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p16-c16",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 16,
    heading: "4",
    text: "4\nCourses and course basket mapping\n16/32",
    tokenCountEstimate: 11
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p17-c17",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 17,
    heading: "Basket 1: Natural Sciences",
    text: "Basket 1: Natural Sciences\nS.no Course name\n1. Physics as Fun:  Unveiling the Magic I\n2. Molecules of Life\n3. Chemistry in Everyday Life\n4. From Atoms to Molecules:  Demystifying Matter\n5. Understanding Biodiversity\n6. Immunology:  From Health to Disease\n7. Science as the Art of Enquiry\n8. Physics As Fun:  Unveiling The Magic II\n17/32",
    tokenCountEstimate: 84
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p18-c18",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 18,
    heading: "Basket 2: Mathematical Sciences",
    text: "Basket 2: Mathematical Sciences\nS.no Course name\n1. The Joy of Maths:  From zero to infinity\n2. Maths and Art\n3. Enjoying Calculus\n4. Numerical Methods using Python Programming\n5. Linear Algebra using Python Programming\n6. Probability Theory\n18/32",
    tokenCountEstimate: 62
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p19-c19",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 19,
    heading: "Basket 3: Computing and Data Science",
    text: "Basket 3: Computing and Data Science\nS.no Course name\n1. Data Science and AI for All\n2. AI Unveiled:  Python powered intelligence\n3. Computation for society\n4. Social Media and Education\n5. Computation for solving real world problems\n6. System Design for Data Driven Applications\n19/32",
    tokenCountEstimate: 72
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p20-c20",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 20,
    heading: "Basket 4: Humanities and Social Sciences",
    text: "Basket 4: Humanities and Social Sciences\nS.no Course name\n1. Inclusive Learning With Liberal Arts\n2. Lessons from History\n3. Poetry, Prose and Drama - An Introductory journey\n4. Art and Aesthetics\n5. Islamic Ethics\n6. An Introductory Course in Economics\n7. Methods of Engaging with Community\n8. Kashmiri Folk Tales\n9. Ethics in the Public Domain\n10. Global Literature\n11. Micro and Macro Premises of Economics\n20/32",
    tokenCountEstimate: 104
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p21-c21",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 21,
    heading: "Basket 5: Engineering and Technology",
    text: "Basket 5: Engineering and Technology\nS.no Course name\n1. Sketch and Build your Prototype\n2. Exploring Neighbourhood with Space Technology\n3. Smart Materials and their Novel Applications\n4. Microcontroller Programming and Project Development\n5. Troubleshooting your PC\n6. Web Designing\n7. CNC Programming\n21/32",
    tokenCountEstimate: 78
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p22-c22",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 22,
    heading: "Basket 6: Earth, Environment and Sustainability",
    text: "Basket 6: Earth, Environment and Sustainability\nS.no Course name\n1. Introduction to Environmental Sustainability\n2. Introduction to Climate Change and Resilience\n3. From Walking to Flying:  Navigating Sustainable Trans-\nportation Solutions\n4. Innovations in global urbanization and climate solutions\n5. Disaster proof future:  innovative strategies\n6. Basics of Hydrology\n7. Drivers of Climate Change\n8. Earth\u2019s Role in a Sustainable Future\n9. Remote Sensing in Climate Science\n22/32",
    tokenCountEstimate: 121
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p23-c23",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 23,
    heading: "Basket 7: Design, Innovation and Business",
    text: "Basket 7: Design, Innovation and Business\nS.no Course name\n1. Design Thinking\n2. Theory of Change\n3. Manager\u2019s Toolkit for Everyday Life\n4. Entrepreneurship and Innovation\n5. Principles of Product Design\n6. Critical Thinking and Logic\n7. Palette and Purpose\n23/32",
    tokenCountEstimate: 66
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p24-c24",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 24,
    heading: "Basket 8: Wellness, Health and Personal development",
    text: "Basket 8: Wellness, Health and Personal development\nS.no Course name\n1. The Art of Effective Communication\n2. Fun To Know Food\n3. Life Saving Heroes\n4. Eat Smart, Live Well:  Your Path to Wellness\n5. Disaster proofing your world\n6. Self-Improvement and Personal Effectiveness\n24/32",
    tokenCountEstimate: 71
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p25-c25",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 25,
    heading: "Sample Course Content",
    text: "Sample Course Content\nCOURSE: Inclusive Learning With Liberal Arts\nCourse Contents:\nModule 1: Introduction to the Liberal Arts\nWeek 1:  What are the liberal arts?  Why\nare they important?\nWeek 2:  Different approaches to the liberal\narts\nWeek 3:  The value of a liberal arts\neducation\nModule 2: Foundations of the Humanities\nWeek 4:  What is literature?\nWeek 5:  The study of history\nWeek 6:  The arts and the liberal arts\nModule 3: Foundations of the Social\nSciences\nWeek 7:  What is economics?\nWeek 8:  The study of government and\npolitics\nWeek 9:  Sociology and the study of society\nWeek 10:  Anthropology and the study of\nculture\nModule 4: Foundations of Philosophy\nWeek 11:  What is ethics?\nWeek 12:  Metaphysics and the study of\nreality\nWeek 13:  Epistemology and the theory of\nknowledge\n25/32",
    tokenCountEstimate: 200
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p26-c26",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 26,
    heading: "Sample Course Content",
    text: "Sample Course Content\nCOURSE: Design Thinking\nCourse Objectives: To learn to identify needs and problems of people, tinker, test and\niterate in teams to work towards solutions, empathize and experiment, and seamlessly\nuse the results of this process to get innovative solutions.\nCourse Outcomes:\n\u2022 Understand:  Learn different mindsets that enable problem solving - Creative\nconfidence, Growth mindset, Embracing ambiguity, Optimism.\n\u2022 Analyze and apply:  Learn the methods to identify needs and problems of people and\ncommunities, frame a design challenge around these problems and work in teams\ntowards solution.\n\u2022 Apply and evaluate:  Learn how to implement a project, assess resources, staff the\nproject, create a pitch, monitor and evaluate.\n\u2022 Design:  Learn how to ideate - come-up with multiple solutions, brainstorm, build\nrapid prototypes, learn from failure, iterate, take feedback.\n26/32",
    tokenCountEstimate: 225
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p27-c27",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 27,
    heading: "Sample Course Content",
    text: "Sample Course Content\nCOURSE: Design Thinking\nCourse Content:\nModule 1: Mindsets:  Creative confidence, Growth Mindset, Make it, Learn from\nfailure, Empathy, Embrace ambiguity, Optimism.\nModule 2: Methods:  Frame a design challenge, Create a project plan, Build a team,\nInterviews, Immersion, Analogous inspiration, Draw it, Resource flow.\nModule 3: Ideation:  Share, Select, Find themes, Create insight statements,\nBrainstorm, Storyboard, Rapid prototyping, Feedback, Iterate\nModule 4: Implementation:  Live prototyping, Roadmap, Resource assessment, Build\npartnerships, Staff your project, Funding strategy, Keep iterating, Create a pitch,\nSustainable revenue, Monitor and evaluate, keep getting feedback\n27/32",
    tokenCountEstimate: 178
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p28-c28",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 28,
    heading: "5",
    text: "5\nMajors\n28/32",
    tokenCountEstimate: 4
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p29-c29",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 29,
    heading: "Majors",
    text: "Majors\nIntegration with existing FYUGP BS (Hons/Research) courses:\n\u2022 English \u2192 Department of English Language and Literature\n\u2022 Islamic Studies \u2192 Department of Islamic Studies\n\u2022 Mathematical Sciences \u2192 Department of Mathematical Sciences\n\u2022 Physics \u2192 Department of Physics\n\u2022 Chemistry \u2192 Department of Chemistry\n\u2022 Arabic Language and Literature \u2192 Department of Arabic Language and Literature\nNew courses, BS (Hons/Research) in:\n\u2022 Media Studies \u2192 Department of Journalism and Media Studies\n\u2022 Data Science \u2192 Department of Mathematical Sciences\n\u2022 Artificial Intelligence \u2192 Centre of Artificial Intelligence\n\u2022 Economics \u2192 Department of Economics 29/32",
    tokenCountEstimate: 161
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p30-c30",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 30,
    heading: "7",
    text: "7\nEarly exit options\n30/32",
    tokenCountEstimate: 7
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p31-c31",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 31,
    heading: "Early exit and admission",
    text: "Early exit and admission\n\u2022 3 years (6 semesters) BS in the Major discipline after completion of three years of\nstudy, contingent upon having acquired a minimum of 50 percent credits in the\nMajor discipline\n\u2022 2 years (4 semesters) Diploma in the Major discipline\n\u2022 1 year (2 semesters) Certificate Course \u2192 Certificate in Critical Thinking after\ncompleting one year of the program\nAdmission\n\u2022 Students shall be admitted in BS(DYOD) through CUET\n31/32",
    tokenCountEstimate: 113
  },
  {
    id: "doc-dyod-academic-structure-curriculum-iust-pdf-p32-c32",
    documentId: "doc-dyod-academic-structure-curriculum-iust-pdf",
    documentTitle: "DYOD Official Academic Structure, Baskets, Credits & Curriculum @ IUST",
    category: "Programme Information",
    subject: "Design Your Own Degree Framework",
    semester: "Semesters 1-8",
    page: 32,
    heading: "Thank You",
    text: "Thank You",
    tokenCountEstimate: 3
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf-p1-c1",
    documentId: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    documentTitle: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    page: 1,
    heading: "Page  1   of  5",
    text: "Page  1   of  5  \n \nEvaluation Strategy for Term - End Project of Undergraduate Students, BS \nDYOD, IUST Awantipora  \n1. Objective    \nThe primary objective of this evaluation strategy is to provide a structured and systematic approach for \nassessing undergraduate student projects  across various phases. This ensures consistency, fairness, and \nthoroughness in the assessment process, promoting a comprehensive evaluation of the   students' work.  \n2. Evaluation Framework    \nThe evaluation process is structured around four key phases: Projec t Proposal, Project Implementation, \nProject Testing and Evaluation , and Project Documentation & Mentor Evaluation. Each phase will be \nassessed using specific criteria outlined in the provided rubric, ensuring clarity and   objectivity in the \nevaluation.  \n3. P hase Breakdown     \nPhase 1: Project Proposal (10 Points)  \nClarity (2.5 Points):    \nAssessment Method: Evaluate the clarity of the proposal in articulating objectives and goals.    \nCriteria: Clear and precise expression of project aims and measurable outcomes.    \nRelevance and Importance (2.5 Points):    \nAssessment Method: Review the justification for the project's relevance to the field.    \nCriteria: Demonstrated significance and potential impact within the discipline.    \nFeasibility (2.5 Points):    \nAssessment Metho d: Analyze the realism of the project's resource assessment, timeline, and anticipated \nchallenges.    \nCriteria: Practical and achievable planning, considering availab le resources and constraints.    \nInnovation (2.5 Points):    \nAssessment Method: Assess the or iginality and creativity of the approach.    \nCriteria: Novelty in approach, research me thods, or solution development.  \nPhase 2: Project Implementation (40 Points)  \nLiterature Study (5 Points):    \nAssessment Method: Evaluate the comprehensiveness and relevance of the literature review and theoretical \nframework.    \nCriteria: A thorough review of relevant literature and a clear understanding of existing methods   and \ntechnologies in the field.",
    tokenCountEstimate: 516
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf-p2-c2",
    documentId: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    documentTitle: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    page: 2,
    heading: "Page  2   of  5",
    text: "Page  2   of  5  \n \n \nObjectiv es (5 Points):    \nAssessment Method: Evaluate whether the project objectives outlined in Phase 1 are clearly reflected in the \nimplementation.    \nCriteria: Clear and measurable objectives aligned with project goals and achievable within the given \nconstraints.  \nMethodology (5 Points):    \nAssessment Method: Assess the appropriateness and thoroughness of the methodology employed in the \nproject.    \nCriteria: Justification for the chosen methods and their adequacy for achieving the project objectives.  \nData Collection/ Prototyping (5 Points):    \nAssessment Method: Review the rigor and soundness of data collection and analysis techniques.    \nCriteria: Accuracy and depth in data collection and analysis processes.  \nExecution Quality (10 Points):    \nAssessment Method: Assess the   overall quality of the project execution.    \nCriteria: Effective implementation and adherence to the proposed plan, demonstrating problem - solving and \nadaptability.  \nTechnical Competence (10 Points):    \nAssessment Method: Evaluate the students \u2019  technical prof iciency and use of relevant tools and technologies.    \nCriteria: Demonstrated skill and competence in utilizing appropriate techno logies for project development.  \nPhase 3:  Project Testing and Evaluation   (30 Points)  \nData Analysis (10 Points):    \nAssessment Met hod: Review the depth and rigor of the data analysis presented.    \nCriteria: Soundness and thoroughness in interpreting r esults and drawing conclusions.  \nExecution Quality (5 Points):    \nAssessment Method: Assess the overall execution quality of the project d uring the presentation.    \nCriteria: Clarity, coherence, and effectiveness in prese nting the findings and results.  \nConclusion (5 Points):    \nAssessment Method: Evaluate the relevance of the conclusion in relation to the project objectives and its \noverall ins ights.    \nCriteria: Insightful, well - supported conclusions that effectively summarize the findings and provide critical \nanalysis.",
    tokenCountEstimate: 506
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf-p3-c3",
    documentId: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    documentTitle: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    page: 3,
    heading: "Page  3   of  5",
    text: "Page  3   of  5  \n \n \nRecommendations (10 Points):    \nAssessment Method: Evaluate the feasibility and clarity of the recommendations based on the pro ject's \nfindings.    \nCriteria: Clear, specific, and actionable recommendations that are aligned with the project \u2019 s results and \nfeasible within the available resources and constraints.  \nPhase 4: Project Documentation and Mentor Evaluation (20 Points)  \nClarity and Organization (5 Points):    \nAssessment Method: Assess the structure, coherence, and readability of the written documentation.    \nCriteria: Well - organized and clearly written report that follows a logical flow.  \nDocumentation (5 Points):    \nAssessment Method: Evaluate the completeness and accuracy of the project documentation.    \nCriteria: Detailed, accurate, and thorough documentation of project work, including methods, results, and \nconclusions.  \nAdherence to Deadlines (5 Points):    \nAssessment   Method: Assess the timely submission of project milestones and final documentation.    \nCriteria: Timeliness and adherence to project deadlines and schedules.  \nCommunication Skills (5 Points):    \nAssessment Method: Evaluate the effectiveness of both verbal an d written communication in presenting the \nproject.    \nCriteria: Clear, coherent, and persuasive communication of ideas and findings.  \n \nScoring Gradient  \n-   90 - 100%: Exceptional performance; excellently organized and exceeds all criteria.    \n-   80 - 89%: High - quali ty work with minor areas for improvement.    \n-   70 - 79%: Adequate, but with noticeable gaps or minor issues.    \n-   60 - 69%: Some organizational and clarity issues; considerable improvement needed.    \n-   50 - 59%: Significant issues with clarity and organization; req uires substantial revisions.    \n-   41 - 49%: Major issues in clarity and organization; substantial improvements required.    \n-   0 - 40%: Lacks clarity and organization; requires major revisions.",
    tokenCountEstimate: 486
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf-p4-c4",
    documentId: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    documentTitle: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    page: 4,
    heading: "Page  4   of  5",
    text: "Page  4   of  5  \n \nRationale for Evaluation Framework  \nPhase 1: Project Proposal (10 Po ints)    \nThe project proposal establishes the foundation for the entire project. By evaluating clarity, feasibility, \nrelevance, and innovation, this phase ensures that students have properly conceptualized their project. A \nstrong proposal provides direction , ensuring that students begin their work with clear and achievable goals.  \nPhase 2: Project Implementation (40 Points)    \nThis phase is critical as it evaluates the execution of the project, including technical skills, problem - solvin g \nabilities, and  resource management. It is the most weighted phase because it reflects students' ability to appl y \ntheir knowledge and skills to real - world challenges, promoting practical learning.  \nPhase 3: End - Term Presentation (30 Points)    \nThe presentation phase assesse s students' ability to communicate effectively, a critical skill in academia and  \nthe professional world. It evaluates how well students convey their project objectives, methods, and findings,  \nensuring that students can present their work in a clear, cohere nt, and professional manner.  \nPhase 4: Project Documentation and Mentor Evaluation (20 Points)    \nThe documentation phase evaluates how well students reflect on their work and the rigor with which they \ndocument their process. It also allows mentors to assess   students' growth, consistency, and professionalism. \nThis phase highlights the importance of accountability and professional communication in both academic and \ncareer contexts.  \n \nImportant Notes:    \n1. Mentor Presence at Presentations: No presentation will b e entertained without the presence of the \nproject mentor. The mentor must be present during the presentation to validate the project \u2019 s \nexecution and to ensure the authenticity of the student \u2019 s work.    \n2. Progress Submission: Progress at each stage of the p roject must be submitted to the office, and it \nshould be vetted and signed off by the mentor.    \n3. Project Timeline: The project timeline must be submitted in advance and be approved by the \nmentor. It should reflect a realistic and achievable schedule, wit h all milestones and deadlines \nclearly outlined and aligned with the project \u2019 s objectives.",
    tokenCountEstimate: 571
  },
  {
    id: "doc-dyod-evaluation-strategy-term-end-project-pdf-p5-c5",
    documentId: "doc-dyod-evaluation-strategy-term-end-project-pdf",
    documentTitle: "Evaluation Strategy for Term-End Project of Undergraduate Students, BS DYOD, IUST",
    category: "Examination and Assessment",
    subject: "Term-End Project Evaluation",
    semester: "Undergraduate DYOD",
    page: 5,
    heading: "Page  5   of  5",
    text: "Page  5   of  5  \n \n \n \n \n3. Timeline  \nPhase    Marks    Date of \nEvaluation/Presentation -  \nI Semester  \nDate of \nEvaluation/Presentation -  \nIII Semester  \nPhase 1:   \nProject Proposal \nPitching  \n \n10 Points     13 th    October 2026     16 th     October 2026  \nPhase 2:   \nProject \nImplementation   \n \n40 Points   17 th   November, 2026   13 th   November, 2026  \nPhase 3:   \nProject Testing and \nEvaluation   \n \n30 Points   22 th   December, 2026   18 th   December, 2026  \nPhase 4:   \nProject \nDocumentation and \nMentor Evaluation   \n \n20 Points   29 th    December (12:00 \nnoon deadline)  \n24 th    December (12:00 noon \ndeadline)  \nNote:  Presentations shall be conducted in dedicated Project slots as per the timetable on the evaluation \ndates.",
    tokenCountEstimate: 189
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p1-c1",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 1,
    heading: "FROM WASTE PAPER TO SEED",
    text: "FROM WASTE PAPER TO SEED\nPAPER\nPHASE 2: DETAILED PROJECT IMPLEMENTATION &\nMETHODOLOGY\nTeam Members:  Sadiya, Gufran, Aatif\nAffiliation:  Design Your Own Degree (DYOD), IUST Awantipora\n1. Project Background & Objectives\nLarge amounts of paper are discarded daily across the Islamic University of Science and Technology\n(IUST) campus. A significant portion of this paper, used for assignments, tests, and packaging, is\nthrown away after a single use. While conventional recycling gives paper another temporary use, it\neventually becomes waste again. Our project aims to address this issue by transforming university\npaper waste into a useful, biodegradable product: seed paper.\nBy integrating viable seeds into handmade recycled paper, we change the paper from something that\nis simply discarded into something that can have a second, life-giving purpose. This document\noutlines the step-by-step physical process we are executing to collect, process, and manufacture our\nprototype seed paper using practical, hands-on methods.\n2. Phase A: Gathering and Preparation\nPhase 2 Implementation Report: Waste Paper to Seed Paper Page 1 of 6",
    tokenCountEstimate: 283
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p2-c2",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 2,
    heading: "Step 1: Collection from IUST Campus",
    text: "Step 1: Collection from IUST Campus\nThe first step in our methodology was to find suitable\nraw material. We walked around the IUST campus and\nsystematically  visited  different  locations,  including\nacademic classrooms, offices, and the student hostels.\nWe gathered a wide variety of discarded paper that\nwould otherwise end up in the trash. This diverse mix\nincluded thrown-away test papers with handwriting, old\ncrumpled  lecture  notes,  and  leftover  corrugated\ncardboard packaging. Sourcing our material directly\nfrom the campus ensures our project directly addresses\nlocal university waste. Fig 1: Discarded test paper collected\nfrom classrooms.\nStep 2: Cleaning and Purifying the Waste\nBefore the paper could be turned into new pulp, it had\nto  be  completely  cleaned.  We  meticulously  went\nthrough  all  the  collected  materials  by  hand.  We\ncarefully removed all staples, metal paper clips, plastic\ntape,  and  laminated  pieces.  This  is  a  crucial\nenvironmental step; if plastic and metal are left in the\nmix, they not only ruin the soft paper pulp and damage\nthe  blending  equipment,  but  they  also  introduce\nharmful microplastics into the soil when the seed paper\nis eventually planted. Fig 2: Crumpled paper being checked\nfor staples and tape.\nPhase 2 Implementation Report: Waste Paper to Seed Paper Page 2 of 6",
    tokenCountEstimate: 335
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p3-c3",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 3,
    heading: "Step 3: Sorting by Paper Type",
    text: "Step 3: Sorting by Paper Type\nNot all paper breaks down the same way. We sorted our\nclean waste into different categories based on their\nthickness, fiber quality, and ink content. We created\nseparate  piles  for  rough  brown  cardboard  waste,\nordinary white A4 paper, and heavily printed test\npapers. Sorting allows us to control the color and\nphysical strength of the final seed paper. We anticipate\nthat cardboard fibers will yield thicker, sturdier paper,\nwhile standard A4 notes will result in a finer, smoother\ntexture.\nFig 3: Corrugated cardboard waste\nsorted by fiber type.\nStep 4: Cutting and Tearing\nLarge, intact pieces of paper take a very long time to\nabsorb water. To speed up the soaking process, we used\nscissors and our hands to cut and tear the sorted paper\ninto small strips and tiny fragments. Tearing the paper\nby hand is highly effective because it creates frayed,\nfeathered edges on the fibers, which bind together much\nbetter during the final sheet formation process than\nsharp scissor cuts. The smaller the pieces, the larger the\nsurface area exposed to water. Fig 4: Clean white paper cut into strips\nfor maximum surface area.\nPhase 2 Implementation Report: Waste Paper to Seed Paper Page 3 of 6",
    tokenCountEstimate: 306
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p4-c4",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 4,
    heading: "3. Phase B: Pulping and Sheet Formation",
    text: `3. Phase B: Pulping and Sheet Formation
Step 5: Hydration and Soaking
We placed all our prepared paper fragments into a large
bucket and filled it with water until the material was
completely submerged. We allow the paper to soak for
an extended period (typically 12 to 24 hours). This deep
hydration is essential; the water penetrates and softens
the tough cellulose fibers within the paper, naturally
breaking down their structure so they can be reshaped
into fresh sheets.
\uFAA3
FIBER SOAKING
PROCESS
Fig 5: Softening the cellulose fibers.
Step 6: Blending into Pulp Slurry
Once the paper is mushy, we take handfuls of the wet
mass and place them into a blender. We add plenty of
fresh water to the blender to ensure the motor doesn't
overheat or jam. Using short, controlled pulses, we
blend the mixture until the mechanical action separates
the fibers completely. The result is a thick, smooth, and
cloudy liquid known as a "pulp slurry," which is the
foundational material for our new paper.
\uF32A
MECHANICAL
PULPING
Fig 6: Creating the pulp slurry.
Step 7: Engineering a Homemade Mesh
In traditional paper making, a tool called a "mould and
deckle" is used to lift pulp from the water. To maintain
sustainability  and  low  costs,  we  engineered  one
ourselves.  We  lashed  four  straight  wooden  sticks
together securely to form a rigid square frame. We then
stretched a piece of thin, porous mesh cloth tightly
across the wooden frame, securing it firmly so it
provides a flat, strong surface for the paper to settle on.
\uF5BC
DIY MOULD
& DECKLE
Fig 7: Constructing the mesh frame.
Phase 2 Implementation Report: Waste Paper to Seed Paper Page 4 of 6`,
    tokenCountEstimate: 413
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p5-c5",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 5,
    heading: "Step 8: Pulling the Paper Sheet",
    text: "Step 8: Pulling the Paper Sheet\nWe fill a wide tub (a vat) with water and pour in our\nblended paper pulp, mixing it thoroughly so the fibers\nare suspended evenly. We then take our homemade\nwooden mesh, submerge it completely under the water\nat an angle, level it out, and slowly lift it straight up. As\nthe water drains freely through the cloth mesh, a\nbeautiful, uniform layer of interwoven wet paper fibers\nis left resting on the surface.\n\uF4A7\nPULLING THE\nSHEET\nFig 8: Lifting fibers from the vat.\n4. Phase C: Seed Integration and Finishing\nStep 9: Pressing the Mustard Seeds\nWhile the newly formed paper sheet is still highly\nsaturated and resting on the cloth mesh, we carefully\nscatter dry mustard seeds evenly across the surface. We\nselected mustard seeds because they are small enough\nto sit flat within thin paper, possess a durable outer\nshell that resists rotting during the wet phase, and have\na highly reliable germination rate. Using our fingers, we\ngently press the mustard seeds down into the soft pulp\nso they become locked inside the fibers without being\ncrushed.\n\uF331\nSEED\nINTEGRATION\nFig 9: Adding viable mustard seeds.\nPhase 2 Implementation Report: Waste Paper to Seed Paper Page 5 of 6",
    tokenCountEstimate: 301
  },
  {
    id: "doc-dyod-project-detailed-methodology-seed-paper-pdf-p6-c6",
    documentId: "doc-dyod-project-detailed-methodology-seed-paper-pdf",
    documentTitle: "From Waste Paper to Seed Paper Phase 2: Detailed Project Implementation & Methodology",
    category: "Practical Work",
    subject: "Sustainability & Material Reuse",
    semester: "Term-End Practical",
    page: 6,
    heading: "Step 10: Pressing and Air Drying",
    text: "Step 10: Pressing and Air Drying\nFinally, we use a dry sponge to gently press the\nunderside of the cloth mesh, using capillary action to\nabsorb excess dripping water. We then carefully invert\nthe wet sheet onto a flat, dry towel or board. The sheets\nare placed in a warm, well-ventilated room to air-dry\nnaturally. Avoiding high heat is critical, as extreme\ntemperatures would kill the seeds. Once all moisture\nhas evaporated, we have strong, fully functional seed\npaper ready for testing.\n\u2600\nCONTROLLED\nDRYING\nFig 10: Evaporating moisture safely.\n5. Next Steps: Testing & Evaluation Phase\nThe physical creation of the paper is only the first half of our project. To satisfy the requirements for\nPhase 3 (Project Testing and Evaluation), our upcoming work will focus on rigorous quantitative\nanalysis:\nP h y s i c a l   Q u a l i t y   T e s t i n g :  We will examine the final dried sheets for structural\nintegrity, tensile strength, thickness consistency, and suitability for writing.\nC o n t r o l l e d   P l a n t i n g   E x p e r i m e n t :  We will plant samples of our mustard seed paper\nunder controlled soil and light conditions (Group B). Simultaneously, we will plant\nbare mustard seeds directly into the soil to act as our baseline control (Group A).\nD a t a   C o l l e c t i o n   &   A n a l y s i s :  We will monitor the test pots daily, recording the days\nuntil emergence (germination time), overall germination percentage, and early seedling\nheight. Comparing Group A and Group B will allow us to scientifically evaluate the\nviability of turning university waste into a sustainable agricultural product.\nPhase 2 Implementation Report: Waste Paper to Seed Paper Page 6 of 6",
    tokenCountEstimate: 424
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p1-c1",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 1,
    heading: "SUSTAINABILITY \u2022 MATERIAL REUSE \u2022 PLANT GROWTH",
    text: "SUSTAINABILITY \u2022 MATERIAL REUSE \u2022 PLANT GROWTH\nFROM WASTE PAPER\nTO SEED PAPER\nTurning university paper waste into plantable paper\nA practical project in recycling, biology & sustainability\nPROJECT PRESENTATION",
    tokenCountEstimate: 53
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p2-c2",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 2,
    heading: "01 \u2022 THE CHALLENGE",
    text: "01 \u2022 THE CHALLENGE\nThe problem: paper waste on campus\nPaper is essential in university life\u2014but much of it is discarded after one use.\n02\nWHERE IT COMES FROM\nAssignments and notes\nExams and printed handouts\nPhotocopying and office records\nPosters, notices and drafts\nWHY IT HAPPENS\nHigh paper consumption\nLimited separation of clean paper\nConvenience of throwing mixed\nwaste away\nLow awareness of creative reuse\nWHY IT MATTERS\nValuable fibres are wasted\nMixed waste is harder to recover\nNew paper uses resources such as\nwood, water and energy\nDisposal adds to the waste burden\nPROJECT QUESTION Can suitable university paper waste be turned into a useful product that\ncan later be planted?",
    tokenCountEstimate: 172
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p3-c3",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 3,
    heading: "02 \u2022 OUR IDEA",
    text: "02 \u2022 OUR IDEA\nWhat makes this project unique?\nWe combine recycled paper fibres with viable seeds\u2014and test whether the result actually works.\n03\nA SECOND PURPOSE\nPaper is used first as stationery,\nthen explored as a plantable\nmaterial instead of being discarded.\nSCIENCE + SUSTAINABILITY\nThe project links waste\nmanagement, cellulose fibres, seed\nbiology and experimental design.\nTESTABLE, NOT JUST CRAFT\nWe will measure sheet quality,\ngermination percentage and early\ngrowth\u2014not just appearance.\nOUR OBJECTIVES\n1 Reuse suitable paper\nwaste\n2 Produce workable\nplantable sheets\n3 Compare seed\ngermination\n4 Identify improvements\nusing data",
    tokenCountEstimate: 160
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p4-c4",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 4,
    heading: "03 \u2022 METHODOLOGY",
    text: "03 \u2022 METHODOLOGY\nMethodology at a glance\nA controlled process\u2014from collecting clean paper to testing seedlings.\n04\n0\n1\nCollect\nGather clean waste\npaper\n0\n2\nSort\nRemove plastic, tape &\nstaples\n0\n3\nSoak\nSoften paper in water\n0\n4\nPulp\nSeparate fibres into pulp\n0\n5\nForm\nSpread pulp on a mesh\n0\n6\nAdd seeds\nMix in viable seeds\ngently\n0\n7\nPress & dry\nRemove water without\noverheating\n0\n8\nTest\nCheck quality and\ngermination\nThen plant labelled samples, observe daily, and compare results with a soil-only control.",
    tokenCountEstimate: 127
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p5-c5",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 5,
    heading: "03 \u2022 METHODOLOGY / STEP 1",
    text: "03 \u2022 METHODOLOGY / STEP 1\nPrepare the paper fibres\nThe first four steps create a clean, even pulp that can form a new sheet.\n05\n1\n1. Collect Gather paper from classrooms, offices, libraries and printing areas. Record the mass collected.\n2\n2. Sort Use clean, uncoated paper where possible. Remove staples, tape, plastic and contaminated pieces.\n3\n3. Soak Tear paper into small pieces and soak until soft. The time depends on thickness and paper type.\n4\n4. Pulp Blend small batches with water, using safe equipment, until the fibres are evenly separated.\nWhy it matters: clean, well-separated fibres help create more consistent sheets.",
    tokenCountEstimate: 159
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p6-c6",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 6,
    heading: "03 \u2022 METHODOLOGY / STEP 2",
    text: "03 \u2022 METHODOLOGY / STEP 2\nForm the sheet and add seeds\nKeep the pulp even and protect seeds from unnecessary heat or rough handling.\n06\n5. FORM THE SHEET\nSpread pulp evenly over a fine\nmesh screen or mould. Allow water\nto drain so fibres settle into a\nconnected layer.\n6. ADD SEEDS\nGently mix suitable, viable seeds\ninto cooled pulp or distribute them\nacross the wet sheet. Keep seed\nquantity consistent.\n7. PRESS & DRY\nPress with a sponge or absorbent\nmaterial. Dry in a clean, ventilated\nplace away from intense heat.\nDESIGN BALANCE\nA thick sheet may be stronger but harder for seedlings to emerge through. A thin sheet may plant well\nbut tear easily. Test to find a practical balance.",
    tokenCountEstimate: 172
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p7-c7",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 7,
    heading: "03 \u2022 METHODOLOGY / STEP 3",
    text: "03 \u2022 METHODOLOGY / STEP 3\nCheck quality before planting\nThe finished paper must be practical to handle and suitable for germination testing.\n07\nStrength\nCan the sheet be lifted and cut without\nfalling apart?\nThickness\nMeasure and label each formulation.\nTexture\nLook for lumps, cracks and uneven seed\ndistribution.\nWater absorption\nObserve how quickly the sheet becomes\nwet.\nSeed viability\nUse a consistent seed batch and suitable\nstorage.\nPlantability\nCheck whether seedlings can emerge\nthrough or around the paper.\nRecord actual observations\u2014do not assume that a sheet is successful just because it looks good.",
    tokenCountEstimate: 153
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p8-c8",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 8,
    heading: "03 \u2022 METHODOLOGY / STEP 4",
    text: "03 \u2022 METHODOLOGY / STEP 4\nPlant, observe and compare\nA simple controlled experiment shows whether seeds survive the process.\n08\nGROUP A \u2022 CONTROL\nPlant seeds directly in soil. This\nprovides a baseline for the selected\nseed variety.\nGROUP B \u2022 SEED PAPER\nPlant the seed-paper sample under\nthe same conditions as the control\ngroup.\nGROUP C \u2022 VARIATION\nTest a different thickness or\nformulation. Change only one main\nvariable at a time.\nDAILY RECORD\n\u2022 Number of seeds germinated \u2022 Days until emergence \u2022 Seedling height \u2022 Moisture and light conditions\nGermination (%) = (seeds germinated \xF7 total seeds tested) \xD7 100",
    tokenCountEstimate: 153
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p9-c9",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 9,
    heading: "04 \u2022 IMPACT",
    text: "04 \u2022 IMPACT\nExpected outcomes and benefits\nThese are targets to test\u2014not results to claim before the experiment is complete.\n09\nEXPECTED OUTCOMES\nUsable seed-paper sheets\nSuitable paper/seed combinations\nidentified\nGermination and early-growth data\nA comparison with ordinary recycling\nENVIRONMENTAL BENEFITS\nReuse some clean paper waste\nEncourage waste segregation\nRaise awareness of plant growth and\nsustainability\nExplore a second use for paper fibres\nPRACTICAL USES\nBookmarks and gift tags\nGreeting cards and invitations\nPlantable event materials\nEnvironmental education activities\nHOW WE WILL MEASURE SUCCESS\nMass of paper reused \u2022 sheets produced \u2022 physical quality \u2022 germination percentage \u2022 time to emergence \u2022\nearly growth \u2022 water and energy used",
    tokenCountEstimate: 189
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p10-c10",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 10,
    heading: "05 \u2022 IMPROVING THE PROJECT",
    text: "05 \u2022 IMPROVING THE PROJECT\nRecommendations for better results\nGood material choices and a fair test matter as much as the final appearance.\n10\n1\nSeparate paper at source\nCollect clean paper and keep it away from food waste.\n2\nChoose appropriate seeds\nUse viable, locally suitable seeds and follow their planting needs.\n3\nProtect seed viability\nAvoid unnecessary heat and store finished sheets dry.\n4\nControl the experiment\nKeep soil, water, light and seed batch consistent.\n5\nRepeat and record\nUse replicates and report actual results, including failures.\n6\nUse the right waste route\nSend unsuitable paper to conventional recycling where possible.",
    tokenCountEstimate: 162
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p11-c11",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 11,
    heading: "06 \u2022 LEARNING & NEXT STEPS",
    text: "06 \u2022 LEARNING & NEXT STEPS\nWhat will we learn\u2014and what comes next?\nThe project connects classroom science with a practical campus sustainability question.\n11\nWHAT WE WILL LEARN\n\u2022 Waste segregation and material reuse\n\u2022 Cellulose fibres and paper formation\n\u2022 Seed viability and germination\n\u2022 Controlled experiments and fair comparisons\n\u2022 Calculating percentages and interpreting data\n\u2022 Teamwork, troubleshooting and communication\nFUTURE SCOPE\n\u2022 Test more seed varieties and paper thicknesses\n\u2022 Check germination after storage\n\u2022 Design different plantable stationery\n\u2022 Estimate water, energy and material use\n\u2022 Compare environmental trade-offs with recycling\n\u2022 Explore a campus collection and workshop programme\nKey lesson: sustainability ideas become stronger when we test them, measure their impact and improve\nthem using evidence.",
    tokenCountEstimate: 208
  },
  {
    id: "doc-dyod-seed-paper-presentation-guide-pdf-p12-c12",
    documentId: "doc-dyod-seed-paper-presentation-guide-pdf",
    documentTitle: "Sustainability & Material Reuse: Waste Paper to Seed Paper Practical Guide",
    category: "Course Materials",
    subject: "Environmental Innovation & Circular Economy",
    semester: "Term-End Practical",
    page: 12,
    heading: "CONCLUSION",
    text: "CONCLUSION\nA second life\nfor paper.\nWe aim to turn suitable university paper waste into plantable\npaper, then test its quality and germination through a controlled\nexperiment.\nREDUCE WASTE \u2022 TEST IDEAS \u2022 GROW KNOWLEDGE\nTHANK YOU\nQuestions?",
    tokenCountEstimate: 60
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p1-c1",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 1,
    heading: "TECHNICAL COMPENDIUM",
    text: "BS DESIGN YOUR OWN DEGREE (DYOD) \u2022 TERM-END PROJECT LITERATURE &\nTECHNICAL COMPENDIUM\nFrom Waste Paper to Seed Paper: Complete\nScientific, Material & Defense Handbook\nA   C o m p r e h e n s i v e   S t u d y   o n   P a p e r   F i b e r   S c i e n c e ,   I n k   P h y t o t o x i c i t y ,   C o m b i n a t i o n   F o r m u l a t i o n s ,\nW h a t m a n   P e t r i   D i s h   S t a n d a r d s ,   a n d   I n d i a n   &   G l o b a l   P r a c t i c e s\nProject Team:  Sadiya, Gufran, Aatif  |   Institution:  Islamic University of Science and Technology (IUST),\nAwantipora  |   Evaluation Phase:  Phase 2 (17 November) & Phase 3 Reference\nSection 1: Executive Summary & Scientific Foundation\nEvery  day,  academic  institutions  generate  large  volumes  of  discarded  paper  from  classroom\nassignments,  examination  sheets,  office  circulars,  notebook  pages,  and  cardboard  packaging.\nConventional paper recycling recovers cellulose fibers for industrial reuse, but the process requires\nheavy chemical de-inking, bleaching, and high energy input, and the resulting paper is eventually\ndiscarded again. Our project at IUST Awantipora investigates a circular, zero-waste alternative:\nconverting campus paper waste directly into biodegradable, plantable seed paper embedded with\nmustard seeds.\nTo succeed in the Phase 2 Implementation Evaluation (40 points) and Phase 3 Testing Evaluation (30\npoints), it is not enough to simply make handmade paper as a craft activity. Evaluators look for\nscientific understanding: why different papers break down at different speeds in water, how printer\ntoner and pen inks affect germinating seeds, what happens when we mix different paper types\ntogether, and how we test seed viability in the laboratory using standard Petri dish filter paper\nmethods.\nThis compendium provides the complete theoretical and experimental knowledge base for our project\nin clear, simple language. It covers the chemistry of seven distinct paper types, five categories of\nwriting  and  printing  inks,  an  exhaustive  matrix  of  paper-and-ink  combinations,  the  official\nInternational Seed Testing Association (ISTA) Whatman filter paper method, detailed examples of\nseed paper production across India and the world, and a complete defense guide for answering panel\nquestions.\nKey Scientific Finding Supporting Our Project:  A peer-reviewed study by  Emperador et al.\n(2024)  tested vegetable seeds in recycled paper versus control soil and proved that  mustard seeds\nachieved a 96.30% germination rate in recycled paper \u2014identical to their 96.30%\ngermination rate in natural soil (P = 0.057, no statistically significant loss of viability). This directly\nvalidates our team's choice of mustard seeds as the ideal model crop for campus waste seed paper.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 1 of 23",
    tokenCountEstimate: 723
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p2-c2",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 2,
    heading: "Section 2: What Paper Is Made Of (Simple Fiber Science)",
    text: 'Section 2: What Paper Is Made Of (Simple Fiber Science)\nTo explain to evaluators why some papers dissolve quickly in a water bucket while others stay stiff for\nhours, we first need to understand the four basic ingredients inside commercial paper:\nCellulose Fibers (The Skeleton):  Paper is made of microscopic plant tubes called cellulose\nfibers, usually extracted from wood, cotton, or recycled agricultural waste. Long fibers (like in\nbrown cardboard) make strong, tear-resistant paper. Short fibers (like in egg trays or newspaper)\nmake soft, crumbly paper that absorbs water very fast.\nHydrogen Bonds (The Natural Magnet):  When wet cellulose fibers are pressed together and\ndried on a mesh, the oxygen and hydrogen atoms on neighboring fibers lock together\nautomatically. These are called hydrogen bonds. When we soak paper in water, water molecules\nslip between the fibers and unlock these bonds so the paper can be reshaped.\nSizing Agents (The Waterproof Glue):  If paper were made of pure cellulose, fountain pen\nink would spread out like a blotter towel. To stop ink from bleeding, paper factories add "sizing"\nchemicals such as starch, rosin, or Alkyl Ketene Dimer (AKD). More sizing means water takes\nmuch longer to soak into the paper.\nMineral Fillers (The White Powder):  White papers like A4 printer sheets and sketch pads\ncontain 10% to 25% powdered minerals\u2014mainly Calcium Carbonate (chalk) and Kaolin (white\nclay)\u2014to make the page bright white, smooth, and heavy. When recycled into thick seed paper, too\nmuch chalk filler can dry into a hard crust that blocks baby plant shoots.\nLignin (The Brown Wood Glue):  Unbleached brown cardboard contains natural lignin, the\nstiff compound that holds tree bark and wood together. Lignin repels water initially during\nsoaking, but once broken down in soil, it turns into rich organic humus that feeds soil microbes.\nSection 3: Complete Analysis of All Paper Types We Can Use\nIn our project, we collected and examined several types of waste paper around the IUST campus and\nhostels, alongside laboratory reference papers. Below is the detailed breakdown of each paper type,\nhow fast it loosens in water, and whether it helps or harms seed germination.\n3.1 Standard A4 Printer & Copier Paper\nWhat it is:  Bleached wood-pulp paper (usually 70 to 80 GSM\u2014grams per square meter) used in\nuniversity offices, photocopy shops, and computer labs for assignments and question papers.\nHow fast it loosens in water:  Medium speed (2 to 6 hours of soaking). Because A4 paper is\ntreated with starch sizing and packed with calcium carbonate chalk filler to survive hot laser printers,\nwater cannot penetrate the surface instantly. Tearing A4 sheets into narrow strips exposes the raw\ninner fibers and cuts soaking time in half.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 2 of 23',
    tokenCountEstimate: 718
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p3-c3",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 3,
    heading: "Effect on seed growth:  Moderate (6/10 when used alone). Pure A4 pulp has short,",
    text: "Effect on seed growth:  Moderate (6/10 when used alone). Pure A4 pulp has short, fine fibers and\nchalk dust that pack very tightly together as the sheet dries. If a pure A4 seed paper sheet dries out\neven slightly in the soil pot, it forms a stiff, cement-like crust that traps the delicate mustard shoot\nunderneath. Additionally, calcium carbonate makes the pulp slightly alkaline (pH 7.8 to 8.5). A4\npaper works best when mixed with coarser papers like cardboard or egg trays.\n3.2 Ruled Notebook & Lined Examination Test Papers\nWhat it is:  Lighter bleached wood or agro-residue paper (55 to 65 GSM) used in student notebooks\nand university answer scripts.\nHow fast it loosens in water:  Moderately fast (1 to 3 hours). Notebook paper is thinner and has\nless surface glue than A4 printer paper, so water softens it much faster in the bucket.\nEffect on seed growth:  Good (7/10). Because it is thinner and contains less mineral chalk than\nheavy A4 copier paper, notebook pulp forms softer sheets that tear open easily when the mustard\nseed swells and sends out its first root (radicle).\n3.3 Corrugated Cardboard Waste\nWhat it is:  Unbleached brown packaging boxes made of two flat linerboards and a wavy middle\nlayer (fluting), held together by natural cornstarch glue.\nHow fast it loosens in water:  Slowest (12 to 24 hours). Cardboard is thick, heavily compressed,\nand contains natural wood lignin that resists water at first. However, once water penetrates the wavy\nair channels and dissolves the cornstarch glue, the layers peel apart easily by hand.\nEffect on seed growth:  Very Good (8/10). Cardboard has long, coarse, unbleached pine fibers and\nzero chemical bleach or chalk filler. When formed into a sheet, these rough fibers cross over each\nother like tiny logs, leaving microscopic air tunnels (high porosity). These air spaces hold moisture\nlike a sponge and allow oxygen to reach the seed, while giving the root easy gaps to push through.\n3.4 Sketchbook, Drawing & Chart Paper\nWhat it is:  Heavyweight cartridge or chart paper (120 to 200 GSM) used by design and architecture\nstudents for sketching, posters, and watercolour work.\nHow fast it loosens in water:  Slow (6 to 12 hours). Sketch paper is specifically engineered not to\nbuckle or dissolve when wet paint or ink is applied. It contains heavy internal and surface sizing\n(starch, gelatin, or synthetic polymers) and is tightly pressed under heavy steel rollers at the factory.\nEffect on seed growth:  Poor when used alone (4/10). When blended and dried, sketch paper pulp\nre-bonds into a dense, leather-like sheet with very low permeability. Water takes a long time to soak\nthrough it in the soil, and germinating mustard seedlings often struggle to pierce the tough fiber mat,\ncausing the shoot to bend sideways (etiolation) or rot underneath. It should only be used in small\nproportions (10% to 20%) to add strength to weak pulps.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 3 of 23",
    tokenCountEstimate: 752
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p4-c4",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 4,
    heading: "3.5 Molded Pulp Egg Trays & Fruit Cartons",
    text: "3.5 Molded Pulp Egg Trays & Fruit Cartons\nWhat it is:  Rough grey or brown trays used to pack eggs and apples, manufactured from 100%\nrecycled newsprint and cardboard slurry without any surface coating or sizing glue.\nHow fast it loosens in water:  Fast (15 to 30 minutes). Because egg trays have already been pulped\nonce and contain zero waterproofing glue, they drink up water immediately like a dry sponge and fall\napart into soft mush with simple hand squeezing.\nEffect on seed growth:  Excellent (9/10). Egg tray pulp is one of the best materials in the world for\nseed paper. Its short, fluffy fibers create a soft, breathable, crumbly blanket around the mustard seed.\nIt retains up to 4 times its weight in water and offers almost zero physical resistance to the emerging\nroot and shoot.\n3.6 Laboratory Filter Paper (Whatman Filter Paper)\nWhat it is:  Pure alpha-cellulose paper made from 100% high-grade cotton linters, completely free of\nwood lignin, starch glue, chalk fillers, or optical brighteners  Cytiva (2020) .\nHow fast it loosens in water:  Very Fast (5 to 15 minutes). With zero sizing chemicals and a pure\nporous network, water wicks into filter paper within seconds (rising at least 30 mm vertically in 2\nminutes according to  ISTA (2018)  standards).\nEffect on seed growth:  Gold Standard (10/10). Because it is chemically neutral (pH 6.5 to 7.0),\nfree of any toxic salt ions (low electrical conductivity), and holds an ideal balance of water and air,\nWhatman filter paper is the official benchmark medium used in biology laboratories worldwide to\ntest seed germination inside Petri dishes.\n3.7 Newspaper & Tissue Paper\nWhat it is:  Lightweight mechanical wood pulp (newspaper, 45 GSM) or cr\xEAped sanitary cellulose\n(tissue, 15 to 25 GSM).\nHow fast it loosens in water:  Instant to Fast (2 to 20 minutes). Tissue disintegrates in seconds;\nnewspaper softens in 15 minutes.\nEffect on seed growth:  Good (7.5/10). Very soft for roots, though pure tissue pulp makes sheets\nthat are too weak and fragile to handle unless mixed with stronger A4 or cardboard fibers. Most\nmodern newspapers use soy-based or vegetable-oil inks, which are safe for soil microbes.\nPaper Type\nGSM\nWeight\nMain\nChemical\nAdditives\nWater\nSoaking\nTime\nWater\nHolding\nCapacity\nDry Sheet\nCrust\nRisk\nSeed\nGrowth\nRating\nWhatman\nFilter Paper\n85\u2013180 None (100%\npure cotton\ncellulose)\n5\u201315 mins\n(Fastest)\nVery High\n(Ideal air-water\nbalance)\nNone\n(Stays soft\nwhen\nmoist)\n10 / 10\n(Lab\nControl)\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 4 of 23",
    tokenCountEstimate: 643
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p5-c5",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 5,
    heading: "GSM",
    text: "Paper Type\nGSM\nWeight\nMain Chemical\nAdditives\nWater\nSoaking\nTime\nWater\nHolding\nCapacity\nDry Sheet\nCrust Risk\nSeed\nGrowth\nRating\nEgg Tray\n(Molded\nPulp)\n250\u2013350 None (Un-sized\nrecycled fibers)\n15\u201330 mins\n(Fast)\nVery High\n(Acts like a\nsponge)\nVery Low\n(Crumbly\ntexture)\n9 / 10\n(Excellent)\nCorrugated\nCardboard\n150\u2013400 Natural wood\nlignin +\ncornstarch glue\n12\u201324 hrs\n(Slowest)\nHigh\n(Coarse air\ntunnels)\nLow (Porous\nfiber gaps)\n8 / 10 (Very\nGood)\nRuled\nNotebook\nPaper\n55\u201365 Light starch sizing\n+ mild filler\n1\u20133 hrs\n(Mod. Fast)\nMedium Moderate 7 / 10\n(Good)\nA4 Printer /\nCopier Paper\n70\u201380 Calcium carbonate\nchalk +\nAKD/starch\n2\u20136 hrs\n(Medium)\nLow to\nMedium\nHigh\n(Forms hard\nsurface\ncrust)\n6 / 10\n(Moderate)\nSketch /\nChart Paper\n120\u2013200 Heavy\nstarch/polymer\nsizing + clay\n6\u201312 hrs\n(Slow)\nLow (Repels\nwater\ninitially)\nVery High\n(Tough\nleathery\nmat)\n4 / 10 (Poor\nAlone)\nSection 4: Deep Dive into Ink Chemistry & Effect on Seed Growth\nDuring our mentor discussion, a central question was raised:  What exact effect does ink have on the\npaper pulp and on the germinating seeds?  Since campus waste paper contains printed question\npapers, photocopied notes, and student handwriting in ballpoint, gel, and liquid pens, understanding\nink chemistry is essential for our evaluation.\n4.1 Un-Inked Paper vs. Inked Paper: The Fundamental Difference\nUn-inked paper  (such as clean A4 trimmings, blank notebook margins, and unprinted cardboard)\ncontains only cellulose fibers, natural starch, and calcium carbonate. It introduces zero synthetic\ndyes, solvents, or polymers into the pulp vat. When planted, un-inked pulp has a clean white or\nnatural brown color and zero chemical phytotoxicity (plant poisoning).\nInked paper  introduces pigments, dyes, carrier solvents, and binder resins into the soaking bucket.\nWhether an ink harms seed growth depends on two scientific factors:  (1) Water Solubility  (does\nthe ink dissolve into the water that the seed drinks during germination?) and  (2) Surface Coverage\nPercentage  (is the page 5% covered in normal text, or 60% covered in solid black photographs?).\n4.2 Laser Printer & Photocopier Toner (Dry Plastic Powder Ink)\nWhat it is made of:  Many people assume printer ink is a liquid, but laser printers and university\nphotocopiers do not use liquid ink. They use  toner , which is an ultra-fine dry powder made of  85%\nto 90% plastic polymer resin  (usually styrene-acrylate or polyester plastic) mixed with  Carbon\nBlack  (pure soot pigment) and tiny particles of  Iron Oxide  (magnetite). During printing, a heated\nroller melts this plastic powder onto the A4 paper fibers at 180\xB0C.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 5 of 23",
    tokenCountEstimate: 680
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p6-c6",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 6,
    heading: "What happens in the soaking bucket & blender:  Because laser toner is melted pla",
    text: "What happens in the soaking bucket & blender:  Because laser toner is melted plastic, it is\ncompletely insoluble in water . It does not bleed or turn the water black. Instead, when we blend\nprinted exam papers, the mechanical blades shatter the melted toner into microscopic black specks\nthat float among the white fibers, turning the final seed paper a speckled light grey.\nEffect on seed growth:\nNormal Text Pages (5% to 15% toner coverage):  Safe for germination. Because the solid\ncarbon-plastic specks cannot dissolve in water, they cannot pass through the semi-permeable cell\nmembranes of the mustard seed root. The seed germinates normally (90% to 96% germination).\nHeavily Printed Pages (>40% solid black graphics/diagrams):  Harmful and should be\nrejected during sorting. High amounts of hydrophobic (water-repelling) plastic toner coat the\ncellulose fibers, preventing the seed paper from absorbing water evenly. Furthermore, putting\nlarge quantities of synthetic styrene-acrylate polymer into soil introduces non-biodegradable\nmicroplastics.\n4.3 Inkjet Printer Ink (Liquid Office & Home Printers)\nWhat it is made of:  Inkjet printers spray microscopic droplets of liquid ink made of water (60% to\n80%), humectants like ethylene glycol or diethylene glycol (to stop the printhead from drying out),\nsurfactants, and organic dyes or pigments.\nWhat happens in the soaking bucket:  Water-based inkjet dyes dissolve rapidly into the soaking\nwater, tinting the water pastel blue, pink, or grey.\nEffect on seed growth:  Safe in normal quantities, provided the soaking water is drained and\nreplaced with fresh water before sheet formation. Modern inkjet inks are manufactured without toxic\nheavy metals (no lead, mercury, or cadmium). However, if concentrated glycol solvents from heavily\ncolored pages are left in the pulp water without rinsing, they can slightly increase the osmotic\npressure of the water, slowing down initial seed water uptake by 12 to 24 hours.\n4.4 Ballpoint Pen Ink (Oil-Based Paste Ink)\nWhat it is made of:  Standard blue, black, and red ballpoint pens (used on most student test\npapers) contain a thick, high-viscosity paste made of  25% to 40% dyes  dissolved in  oil-based\norganic solvents  (such as benzyl alcohol or phenoxyethanol) and synthetic resins (alkyd or\nphenolic resin).\nWhat happens in the soaking bucket:  Because oil and water do not mix, ballpoint pen ink is\nhydrophobic. When you soak a handwritten test paper in a bucket of water, the blue ballpoint writing\nstays firmly stuck to the paper fibers and barely bleeds into the water at all. When blended, the dyed\nfibers mix evenly into the pulp.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 6 of 23",
    tokenCountEstimate: 685
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p7-c7",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 7,
    heading: "Effect on seed growth:  Minimal to Zero negative effect on normal handwritten pa",
    text: 'Effect on seed growth:  Minimal to Zero negative effect on normal handwritten pages. Why? First,\nhandwritten notes cover less than 3% to 5% of the total surface area of a sheet of paper. Second, the\nvolatile alcohol solvent (benzyl alcohol) evaporates completely within minutes of the student writing\non the page\u2014months before we collect the paper! Third, because the remaining dye-resin paste is\nlocked onto the fibers and does not dissolve into the water, the germinating mustard seed does not\nabsorb it.\n4.5 Gel Pen Ink (Water-Based Biopolymer Gel)\nWhat it is made of:  Gel pens use solid pigment particles (like copper phthalocyanine for blue or\niron oxide/carbon black) suspended in water thickened with a natural biopolymer gel called  xanthan\ngum  (made by fermenting simple sugars) and polyacrylate thickeners.\nWhat happens in the soaking bucket:  Gel ink softens in water and releases tiny pigment\nparticles without releasing toxic solvents.\nEffect on seed growth:  Very Safe. Xanthan gum is a natural, biodegradable polysaccharide that\nactually holds moisture around the seed, and the trace pigment levels on handwritten notes are non-\ntoxic to plant roots.\n4.6 Liquid Ink Pens (Pilot V5/V7, Rollerball & Fountain Pens)\nWhat it is made of:  Liquid ink pens use pure, low-viscosity water-based solutions containing 90%\nwater, a small amount of glycerol, and water-soluble acid or direct dyes (such as Acid Blue 93 or\nDirect Black).\nWhat happens in the soaking bucket:  The moment a page written with a Pilot pen or fountain\npen touches water in the bucket, the ink bleeds out into the water like a cloud of blue or black dye.\nEffect on seed growth:  Safe\u2014and easiest to clean! Because liquid pen ink is 100% water-soluble,\n70% to 85% of the ink washes out into the soaking bucket water  during our 12-to-24-hour\nhydration phase. When we pour off that dirty blue soaking water and blend the paper in fresh clean\nwater, almost all the dye is already gone! If we did not drain the dirty soaking water, high\nconcentrations of aniline/acid dyes could stain the seed coat and slightly reduce root hair elongation.\n4.7 Scientific Mechanism: How Heavy Ink & Paper Effluent Harm Seeds\nIf an evaluator asks:  "Scientifically, how does too much chemical or ink in paper hurt a seed?" \u2014here\nis the exact biological mechanism proven by plant physiology studies  IJASRM (2019)  and\nEnvironment and Ecology (2025) :\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 7 of 23',
    tokenCountEstimate: 628
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p8-c8",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 8,
    heading: "1.  Osmotic Stress (Salt & Solute Imbalance):  A dry seed absorbs water by a phy",
    text: "1.  Osmotic Stress (Salt & Solute Imbalance):  A dry seed absorbs water by a physical process\ncalled  imbibition  and  osmosis \u2014water naturally moves from an area of low dissolved salts (clean\nwater) into the seed (high internal solutes). If paper pulp water has high Electrical Conductivity\n(EC) from dissolved ink salts, bleaching chlorides, or chemical sizing, it creates osmotic resistance,\nmaking it harder for the seed to drink water and delaying germination.\n2.  pH Shift (Alkaline or Acidic Shock):  Mustard seeds germinate best at a slightly acidic to\nneutral pH of  6.0 to 7.0 . Heavily bleached A4 paper with high calcium carbonate filler pushes pH\nup to 8.4 (alkaline), while certain industrial paper effluents drop pH to 5.4 (acidic). Extreme pH\nslows down the natural enzymes (like amylase and protease) inside the seed that unlock stored\nfood for the embryo.\n3.  Radicle Tip Inhibition & Chlorophyll Reduction:  Studies on paper effluent show that while\nlow dilutions (20% to 25%) allow normal or even stimulated seedling growth, 100% concentrated\nchemical sludge reduces early root (radicle) length and decreases Chlorophyll-a and Chlorophyll-b\nsynthesis in the first green leaves (cotyledons)  Environment and Ecology (2025) .\nInk\nCategory\nChemical\nBase\nBehavior in\nSoaking\nBucket\nRemoved\nby Draining\nSoak\nWater?\nImpact on\nMustard\nGermination\n(Normal Text)\nImpact at\nHeavy\nCoverage\n(>40% Page)\nNo Ink\n(Blank\nPaper)\nPure Cellulose +\nStarch/Chalk\nClear water; no\ndye release\nYes (Excess\nstarch rinses\nout)\n96%\u2013100%\n(Baseline)\nN/A (Safe at\n100%)\nLaser\nPrinter /\nCopier\nToner\nMelted Styrene-\nAcrylate Plastic\n+ Carbon Black\nInsoluble;\nbreaks into tiny\ngrey/black\nspecks\nNo (Stays as\nsolid specks\nin pulp)\n92%\u201396% (Inert\nsolid specks)\nPoor (65%\u2013\n75%) ; blocks\nwater & adds\nmicroplastic\nInkjet\nPrinter Ink\nWater + Glycol\n+ Organic Dyes\nBleeds color into\nsoaking water\nYes (60%\u2013\n75% washes\nout)\n90%\u201395% (Safe\nafter rinsing)\nModerate\n(75%\u201382%) ;\nglycol slows\nosmosis if\nunrinsed\nBallpoint\nPen Ink\nOil Paste +\nBenzyl Alcohol +\nResin + Dye\nHydrophobic;\nstays stuck to\nfibers\nNo (Remains\nbound to\nfiber)\n94%\u201396% (Low\ncoverage <5%,\nnon-leaching)\nModerate\n(80%) ; oil\nrepels water\nlocally\nGel Pen Ink Water +\nXanthan Gum\nBiopolymer +\nPigment\nDisperses gently\nin water\nPartially\n(40%\u201350%\nrinses out)\n95%\u201396%\n(Biopolymer is\nplant-safe)\nGood (88%\u2013\n90%) ; low\ntoxicity\nLiquid Pen\n(Pilot V5 /\nFountain)\nWater +\nGlycerol +\nAcid/Direct\nDyes\nBleeds\nimmediately into\nbucket water\nYes (75%\u2013\n85% washes\nout!)\n93%\u201396%\n(Clean after\nwater change)\nModerate\n(80%\u201385%)  if\nwater is not\ndrained\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 8 of 23",
    tokenCountEstimate: 671
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p9-c9",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 9,
    heading: "Section 5: Complete Paper & Ink Combination Matrix (All",
    text: `Section 5: Complete Paper & Ink Combination Matrix (All
Combinations Explained)
One of the smartest questions an evaluator or mentor can ask is:  "What happens if you don't just use
one  type  of  paper,  but  combine  different  paper  types  and  inked  papers  together?"  In Materials
Science, combining two materials with opposite properties creates a  composite material  that is
better than either material alone. Below is the complete scientific analysis of every single combination
we can make from our collected samples.
5.1 Combination 1: A4 Printer-Inked Paper + Corrugated Cardboard (50:50 Mix)
Why combine them:  A4 printer paper has short, tight fibers and chalk that dry into a hard crust,
whereas corrugated cardboard has long, coarse, unbleached fibers with wide air gaps.
Physical sheet quality:  Produces a strong, medium-thick, earthy light-brown sheet with tiny grey
flecks from the printer toner. Very easy to lift off the cloth mesh without tearing.
Effect on seed growth:   Excellent (90% to 95% expected germination).   The  coarse
cardboard fibers act as "spacers" between the fine A4 fibers, completely preventing the A4 paper from
forming a hard crust. Water soaks in quickly through the cardboard channels, and the mustard root
pushes out effortlessly.
5.2 Combination 2: A4 Pen-Inked Notes + Corrugated Cardboard (50:50 Mix)
Why combine them:  Student lecture notes and test papers written with ballpoint or Pilot pens are
thinner than copier paper and contain zero plastic laser toner.
Physical sheet quality:  A soft, warm beige sheet with high flexibility and a natural handmade look.
Effect on seed growth:   Superior (93% to 96% expected germination).  Because Pilot pen ink
washes out during soaking and ballpoint ink covers less than 5% of the page, there is no plastic toner
barrier. Combined with the airy structure of cardboard, this is one of the best campus-waste
formulations possible.
5.3 Combination 3: A4 Inked Paper + Sketch/Chart Paper with Pen/Marker Ink
(50:50 Mix)
Why combine them:  Both materials are abundant in design and university classrooms.
Physical sheet quality:  Produces a very smooth, bright, stiff, card-like sheet that looks like
commercial greeting card stock and is very easy to write on with a pen.
Effect on seed growth:   Poor (55% to 70% expected germination; delayed by 2 to 4 days).
This is a "bad combination" for plant growth that we should highlight to evaluators as a negative
control! Both A4 paper and sketch paper are loaded with starch sizing and mineral fillers. When
combined, they lock together into a dense, low-porosity barrier. Even when the mustard seed
germinates underneath, the tender shoot struggles to pierce the wet card unless we prick tiny
pinholes in the sheet before planting.
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 9 of 23`,
    tokenCountEstimate: 720
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p10-c10",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 10,
    heading: "5.4 Combination 4: A4 Inked Paper + Egg Tray Pulp (50:50 Mix)",
    text: '5.4 Combination 4: A4 Inked Paper + Egg Tray Pulp (50:50 Mix)\nWhy combine them:  Egg tray pulp holds massive amounts of water and stays fluffy, while A4\nfibers give the sheet flat strength and a smoother surface for pressing seeds.\nPhysical sheet quality:  Soft, slightly textured off-white or light grey sheet with moderate tear\nstrength.\nEffect on seed growth:   Outstanding (95% to 98% expected germination).  The egg tray\nfibers act as micro-sponges right next to the mustard seed coat, keeping moisture constant for 72\nhours while the A4 fibers hold the sheet intact during handling.\n5.5 Combination 5: A4 Inked Paper + Whatman Filter Paper (50:50 Mix)\nWhy combine them:  Mixing pure laboratory cotton cellulose with ordinary campus waste paper\ndilutes the chalk fillers and sizing chemicals by 50%.\nPhysical sheet quality:  Crisp, bright, soft white sheet with rapid capillary water absorption.\nEffect on seed growth:   Excellent (94% to 97% expected germination).  The pure filter paper\nfibers wick water straight to the mustard seed within seconds of watering.\n5.6 Combination 6: Corrugated Cardboard + Sketch/Chart Paper (70:30 or\n50:50 Mix)\nWhy combine them:  If we want to recycle stiff sketch/chart waste without suffocating the seeds,\nmixing it with coarse cardboard opens up the dense structure of the sketch paper.\nPhysical sheet quality:  Heavy, rigid board suitable for plantable gift tags, coasters, or notebook\ncovers.\nEffect on seed growth:   Moderate to Good (75% to 85% expected germination).  The rough\ncardboard fibers disrupt the continuous starch film of the sketch paper, creating weak spots where\nmustard roots and shoots can break through.\n5.7 Combination 7: Corrugated Cardboard + Egg Tray Pulp (50:50 Mix)\nWhy combine them:  Combining long unbleached fibers (cardboard) with short un-sized recycled\nfibers (egg tray) creates a 100% unbleached, chemical-free agricultural mat.\nPhysical sheet quality:  Earthy brown, thick, spongy, and rough\u2014not ideal for fine handwriting,\nbut perfect as a biodegradable "seed mat" or plantable pot liner.\nEffect on seed growth:   Best Soil Performance (96% to 99% expected germination).  Zero\nbleach, zero chalk, high aeration, and rapid biodegradation in soil by natural cellulase-producing\nfungi.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 10 of 23',
    tokenCountEstimate: 591
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p11-c11",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 11,
    heading: "5.8 Combination 8: Sketch/Chart Paper + Egg Tray Pulp (40:60 Mix)",
    text: '5.8 Combination 8: Sketch/Chart Paper + Egg Tray Pulp (40:60 Mix)\nWhy combine them:  Rescues heavy sketch paper waste by pairing it with ultra-soft egg carton\npulp.\nPhysical sheet quality:  Balanced medium-stiff sheet with a speckled artistic texture.\nEffect on seed growth:   Good (82% to 88% expected germination).  As long as egg tray pulp\nmakes up at least 60% of the mix, the sheet remains porous enough for mustard seedlings to emerge\ncleanly.\n5.9 Combination 9: The "IUST Optimum Tri-Blend" (50%Ink-Washed\nA4/Notebook + 30% Cardboard + 20% Egg Tray)\nWhy this is our recommended master formulation:  By combining all three campus waste\nstreams in a 50:30:20 ratio, we get the best of every material:\n50% A4/Notebook Paper  gives a light color and smooth surface so the paper can actually be\nwritten on or printed as tags and cards.\n30% Corrugated Cardboard  provides long structural fibers (tear strength) and microscopic air\nchannels so the A4 paper never forms a hard crust.\n20% Egg Tray Pulp  acts as a built-in water sponge around the mustard seeds, ensuring fast,\nuniform germination in 3 to 4 days.\nCombination\nFormula (Ratio)\nBlend Soak\nTime\nSheet\nStrength &\nWritability\nWater\nAbsorption\nSpeed\nRoot & Shoot\nPenetration\nExpected\nMustard\nGermination %\n1. A4 Printer-\nInked +\nCardboard\n(50:50)\n12 hrs\n(Cardboard\ngoverns)\nHigh strength;\nGood\nwritability\nFast Easy\n(Cardboard\nbreaks crust)\n90% \u2013 95%\n2. A4 Pen-Inked\n+ Cardboard\n(50:50)\n12 hrs High strength;\nGood\nwritability\nFast Very Easy 93% \u2013 96%\n3. A4 Inked +\nSketch/Chart\nInked (50:50)\n8\u201312 hrs Very High;\nSmooth card\nsurface\nSlow (Heavy\nstarch sizing)\nDifficult (High\ncrust barrier)\n55% \u2013 70%\n(Slow)\n4. A4 Inked +\nEgg Tray (50:50)\n3\u20134 hrs Moderate\nstrength; Fair\nwritability\nVery Fast\n(Spongy)\nVery Easy 95% \u2013 98%\n5. A4 Inked +\nWhatman Filter\n(50:50)\n3\u20134 hrs Moderate;\nSmooth white\nfinish\nInstant\ncapillary\nwicking\nVery Easy 94% \u2013 97%\n6. Cardboard +\nSketch Paper\n(70:30)\n12\u201324 hrs Very High\n(Thick tag\nboard)\nMedium Moderate 75% \u2013 85%\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 11 of 23',
    tokenCountEstimate: 525
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p12-c12",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 12,
    heading: "Combination",
    text: 'Combination\nFormula (Ratio)\nBlend\nSoak Time\nSheet\nStrength &\nWritability\nWater\nAbsorption\nSpeed\nRoot & Shoot\nPenetration\nExpected\nMustard\nGermination %\n7. Cardboard +\nEgg Tray (50:50)\n12 hrs Moderate;\nRough surface\n(Bad for pen)\nVery Fast Effortless (Soft\nporous mat)\n96% \u2013 99%\n8. Sketch Paper +\nEgg Tray (40:60)\n8\u201310 hrs Good strength;\nTextured\nsurface\nFast Good 82% \u2013 88%\n9. IUST Tri-Blend\n(50% A4 + 30%\nCard + 20% Egg)\n12 hrs\n(Separate or\njoint soak)\nIdeal Balance\n(Strong &\nWritable)\nVery Fast &\nEven\nVery Easy\n(Zero\ncrusting)\n95% \u2013 98%\n(Optimum)\nSection 6: The "Watch Paper" Mystery Solved: Whatman Filter\nPaper & Petri Dish Standard Protocol\nDuring our meeting, our mentor mentioned testing seeds on "watch paper" inside a Petri dish. In\nlaboratory terminology, this refers to  Whatman Filter Paper  (which phonetically sounds like\n"watch-man paper") used inside a  9-cm Glass Petri Dish  or covered  Watch Glass . This is the\nofficial international standard method defined by the  International Seed Testing Association\n(ISTA)  for testing both seed viability and paper toxicity  Cytiva (2020) ,  ISTA (2018) .\n6.1 Why Scientists Use Whatman Filter Paper in a Petri Dish Instead of Soil\nWhen we plant seed paper in garden soil, many outside variables can ruin the experiment: soil might\ncontain fungal spores, insects, uneven fertilizer pockets, or clay lumps. By testing our seeds and our\nrecycled paper inside a closed glass Petri dish lined with Whatman No. 1 Filter Paper, we create a\n100% sterile, transparent, controlled micro-climate  where:\nWe can see the exact hour the tiny white root tip (radicle) breaks out of the mustard seed coat\nwithout digging up soil!\nMoisture does not evaporate quickly because the glass Petri dish lid traps humidity.\nWhatman Grade 1 (Product Code 1001090) and Grade 181/3644 papers are made of 100% pure\ncotton linters with neutral pH and zero toxic ions, providing a perfect 100% baseline to compare\nour recycled waste papers against  Cytiva (2020) ,  ICRISAT (2020) .\n6.2 Step-by-Step Lab Protocol: The ISTA "Top of Paper" (TP) Petri Dish Test\nWe can run this exact experiment in the IUST laboratory (or even in our hostel/home using clean\ndishes) in just 5 days to generate gold-standard scientific graphs for our Phase 2 and Phase 3\npresentations  ICRISAT (2020) :\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 12 of 23',
    tokenCountEstimate: 604
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p13-c13",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 13,
    heading: "1.  Prepare 4 Petri Dishes (9 cm diameter):  Wash and dry four clear glass Petri",
    text: '1.  Prepare 4 Petri Dishes (9 cm diameter):  Wash and dry four clear glass Petri dishes and\nlabel their lids with a marker:\nDish A (Laboratory Gold Control):  Lined with two circles of pure  Whatman No. 1\nFilter Paper  + 25 bare mustard seeds placed on top.\nDish B (Pure A4 Inked Seed Paper):  A 9-cm circle cut from our recycled  A4 Inked Seed\nPaper  containing 25 mustard seeds.\nDish C (Cardboard / Tri-Blend Seed Paper):  A 9-cm circle cut from our  A4 +\nCardboard Seed Paper  containing 25 mustard seeds.\nDish D (Soil Control):  A small dish/pot filled with standard garden soil + 25 bare mustard\nseeds.\n2.  Add Exact Measured Water:  Using a syringe or dropper, add exactly  4 mL to 5 mL of\ndistilled or clean boiled water  to each Petri dish so the paper is thoroughly moistened but\nseeds are not swimming underwater (seeds need oxygen to breathe!).\n3.  Incubation & Daily Observation:  Cover the Petri dishes with their glass lids and keep them at\nroom temperature (18\xB0C to 22\xB0C indoors) near indirect daylight.\n4.  Counting Germination Every 12 to 24 Hours:  According to  ICRISAT (2020)  and  ISTA\n(2018)  rules, a seed is officially counted as  germinated when the white radicle (root tip)\nprotrudes by 2 mm to 4 mm  through the seed coat and paper layer.\n5.  Measuring Paper Capillary Quality (The 2-Minute Strip Test):  Cut a 10-mm wide vertical\nstrip of each handmade paper (A4, Cardboard blend, Sketch blend) and dip the bottom 20 mm\ninto a beaker of water. Measure how many millimeters the water climbs up the paper in 2\nminutes. High-quality germination paper rises at least  30 mm in 2 minutes   ICRISAT (2020) !\nSection 7: Where Seed Paper Is Made & Used in India (Detailed\nNational Map)\nOur mentor and evaluators will certainly ask:  "Is  seed  paper  actually  made  in  India?  Which\ninstitutes, cities, and startups are doing it, and how does our project compare?"  India is actually one\nof the global leaders in handmade and plantable paper. However, there is a big difference between\nwhat commercial Indian companies do (using factory cotton rags) and what our IUST project does\n(using post-consumer university paper waste).\n7.1 Government Research Institute: KNHPI, Sanganer, Jaipur (Rajasthan)\nOrganization:  The  Kumarappa National Handmade Paper Institute (KNHPI)  located in\nSanganer,  Jaipur,  is  an  autonomous  institute  under  the  Khadi and Village Industries\nCommission (KVIC), Ministry of MSME, Government of India , and is officially recognized\nby the Department of Scientific and Industrial Research (DSIR)  KNHPI (2021) .\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 13 of 23',
    tokenCountEstimate: 666
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p14-c14",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 14,
    heading: "What they do:  Inaugurated in 1994 with technical support from UNDP/UNIDO, KNHPI",
    text: `What they do:  Inaugurated in 1994 with technical support from UNDP/UNIDO, KNHPI is the only
dedicated handmade paper research institute of its kind in Asia  KNHPI Profile (2024) . Their
official R&D mandate explicitly includes  "Product Design 4.3: Development of Germination
Paper"  alongside acid-free paper, banana fiber paper, water hyacinth paper, and even converting
shredded white currency waste from the Reserve Bank of India / Security Printing and Minting
Corporation  into  pulp  pads  Papermart (2022) .  Sanganer  in  Jaipur  employs  thousands  of
traditional  Kagzi  artisans producing handmade and seed-embedded papers exported worldwide.
7.2 Mumbai & Pune (Maharashtra): 21Fools & India's First Plantable
Newspaper
Organization:   21Fools  (based in Mumbai) is one of India's best-known sustainable stationery
social enterprises  21Fools (2024) .
What they did:  In August 2018, inspired by a tweet from industrialist Anand Mahindra about
Japan's green newspaper, 21Fools launched  India's first newspaper printed on plantable seed
paper   21Fools (2018) . They highlighted a critical statistic:  India's paper recovery and
recycling rate is only about 26% , meaning 74% of paper is wasted  21Fools (2018) . They
manufacture  Beej Kapas  (seed cotton) paper in thicknesses from 100 GSM to 350 GSM using pre-
consumer cotton waste from garment factories, embedding 15 to 20 varieties of seeds including Holy
Basil ( Tulsi ), Marigold, Tomato, Green Chilli, and Wildflowers  21Fools (2024) .
7.3 New Delhi / NCR: bioQ Eco Solutions & Wildlense
Organization:   bioQ  (New Delhi) produces mass-scale plantable seed paper stationery for corporate
events, schools, and government functions across India  bioQ (2024) .
What they do:  They convert cotton textile waste into plantable bookmarks, wedding invitations,
B6/A5 notebook covers, plantable children's coloring books, and  Tricolour Plantable Seed Paper
Badges  worn on Independence Day and Republic Day so that flags and badges are planted in pots
instead of thrown in dustbins after the ceremony  bioQ (2024) . They print exclusively on one side
using eco-friendly  water-based inks  to protect seed germination.
7.4 Paradsinga & Wardha (Central India): Gram Art Project
Organization:  Rural collectives like the  Gram Art Project  in Paradsinga (Madhya Pradesh /
Maharashtra border) work with rural women and small farmers to create zero-chemical handmade
seed papers, plantable festival  Rakhis , and seed balls using local farm residues, non-GMO native
seeds, and natural vegetable dyes (turmeric, beetroot, indigo).
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 14 of 23`,
    tokenCountEstimate: 673
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p15-c15",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 15,
    heading: "7.5 Traditional Handmade Paper Clusters Across India",
    text: "7.5 Traditional Handmade Paper Clusters Across India\nKalpi (Uttar Pradesh):  Major KVIC cluster recycling hosiery cotton cuttings and waste paper\ninto handmade file covers and seed sheets.\nAhmedabad & Junagadh (Gujarat):  Startups producing plantable wedding cards and\npackaging boxes for organic brands.\nAuroville & Madurai (Tamil Nadu):  Artisans blending recycled paper with flower petals,\nlemongrass, and native herb seeds.\n7.6 Local Connection: Jammu & Kashmir's Heritage of  K o s h u r   K a g a z  & Why\nMustard Fits Kashmir\nBringing our project home to  IUST Awantipora and Jammu & Kashmir  gives us two powerful\npoints that will deeply impress evaluators:\nReviving Kashmir's 600-Year-Old Handmade Paper Heritage:  In the 15th century,\nSultan Zain-ul-Abidin (Budshah)  brought master papermakers from Samarkand to Kashmir,\nestablishing the famous  Kagazgari  industry in Nowshera and Phulwari (Srinagar). Traditional\nKashmiri handmade paper ( Koshur Kagaz ) was made by pulping waste cotton rags and hemp\nfibers on floating wooden moulds, prized across India and Persia for its durability and\nsmoothness. Our project at IUST modernizes this historic Kashmiri craft by turning campus waste\npaper into living, plantable seed paper!\nWhy Mustard ( T i l g o g u l   /   S a r s o o n ) is the Ideal Crop for Kashmir in November:\nCommercial Indian seed paper from Mumbai or Delhi contains basil ( Tulsi ) or tomato seeds,\nwhich require warm tropical temperatures (25\xB0C to 30\xB0C) and die in Kashmir's cold\nNovember/December weather! In contrast,  Mustard ( B r a s s i c a   c a m p e s t r i s   /   B r a s s i c a\nj u n c e a , locally called  T i l g o g u l ) is Kashmir's primary winter Rabi oilseed crop , sown\nacross Pulwama, Awantipora, and Anantnag right in October and November! Mustard seeds\nnaturally germinate at cool temperatures (10\xB0C to 20\xB0C), making our seed paper scientifically\nadapted to the Kashmir Valley climate.\nHow Our IUST Project Differs from Commercial Indian Seed Paper:  Most commercial\nIndian seed paper companies (like 21Fools and bioQ) use  pre-consumer white cotton cloth scraps\nfrom textile mills  21Fools (2024) ,  bioQ (2024) . While tree-free, that does not solve the massive\nproblem of  post-consumer written and printed paper waste  piling up in universities. Our project\nspecifically tackles real, inked post-consumer university paper and cardboard waste and proves how\nto turn it into viable plantable paper.\nSection 8: Global History & International Case Studies\nTo earn full marks in the  Literature Study (5 Points)  rubric of Phase 2, we can cite the historical\nevolution and international benchmarks of seed paper:\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 15 of 23",
    tokenCountEstimate: 692
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p16-c16",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 16,
    heading: "105 AD \u2013 Ancient China (Invention of Wet-Laid Papermaking):  Eunuch official  Ts",
    text: `105 AD \u2013 Ancient China (Invention of Wet-Laid Papermaking):  Eunuch official  Ts'ai
Lun  during the Eastern Han Dynasty invented the exact wet-pulping and screen-lifting process
we use today, macerating mulberry bark, hemp waste, old rags, and fishnets in water and lifting a
mat of fibers on a cloth-stretched wooden frame.
8th to 19th Century \u2013 Japan ( W a s h i  & Seed Balls):  Japanese artisans perfected handmade
paper incorporating natural leaves and fibers, while Japanese natural farming pioneer
Masanobu Fukuoka  popularized encasing seeds in protective fibrous clay balls to prevent birds
and drying winds from killing broadcast seeds.
1941 \u2013 International Seed Testing Rules:  Standardized cellulose germination blotter papers
(Whatman grades) were codified for agricultural testing laboratories  ISTA (2018) .
1997 \u2013 Canada & North America (Commercialization of Post-Consumer Seed Paper):
Pioneers  Heidi Reimer-Epp and Mary Reimer  founded  Botanical PaperWorks  in Winnipeg,
Canada, developing standardized techniques to embed wildflower, herb, and vegetable seeds into
post-consumer office waste paper without crushing or cooking the seeds during drying.
2016 \u2013 Japan (The World-Famous "Green Newspaper" /  M i d o r i   n o   S h i n b u n ):  On
Greenery Day (May 4, 2016), one of Japan's largest newspapers,  The Mainichi Shimbun  (in
partnership with Dentsu Inc.), published a special edition printed entirely on 100% recycled
biodegradable seed paper using vegetable-based inks. It reached over 4.6 million readers,
achieved huge media impact, and was adopted by Japanese schools to teach children circular
sustainability.
2024 \u2013 Philippines / International Agricultural Research:   Emperador et al. (2024)
published quantitative trials in the  International Journal of Plant & Soil Science  comparing four
vegetable seeds (pechay, mustard, spinach, and saluyot) grown on recycled waste paper versus
soil, proving statistically that mustard (96.30%) and pechay (100%) germinate rapidly on recycled
paper substrates.
Section 9: Practical Scientific Innovations We Can Introduce in
Our Project
Phase 1 and Phase 2 evaluations explicitly award points for  Innovation, Problem-Solving, and
Technical Competence . Here are five simple, low-cost scientific innovations our team can apply
and explain during the presentation:
9.1 Innovation 1: The "Two-Stage Pre-Soak Wash" (Natural De-Inking Without
Chemicals)
Industrial paper mills use toxic caustic soda (sodium hydroxide), hydrogen peroxide, and flotation
surfactants to remove ink. Instead, we use a simple physical method: we soak our torn inked papers
in the blue bucket for 18 to 24 hours. During this soak, water-soluble pen dyes (Pilot/fountain pens),
surface dust, and excess starch sizing leach out into the water. Before putting the paper into the
blender, we  drain and discard this first dirty water  and refill with fresh clean water. This
removes up to 80% of soluble dyes and salts with zero chemical cost!
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 16 of 23`,
    tokenCountEstimate: 773
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p17-c17",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 17,
    heading: "9.2 Innovation 2: Surface-Pressed Embedding vs. Blender/Vat Mixing",
    text: '9.2 Innovation 2: Surface-Pressed Embedding vs. Blender/Vat Mixing\nMany amateur projects dump seeds into the pulp bucket, which causes two problems: (1) seeds sink\nto the bottom of the bucket in water, resulting in uneven seed count per sheet, and (2) seeds get\nburied too deep inside thick pulp, suffocating the shoot. In our methodology (Step 9), we pull a\nuniform wet sheet on our wooden cloth mesh first, and then  count an exact number of dry\nmustard seeds (e.g., 25 or 50 seeds per sheet) and press them gently into the top wet\nsurface . This guarantees exact scientific repeatability and ensures every seed can breathe and\nemerge easily.\n9.3 Innovation 3: The "Pin-Prick Micro-Perforation" Technique for Stiff Papers\nWhen recycling stiff papers like A4 copier sheets or sketch paper, drying shrinks the fibers tightly\ntogether. While the sheet is half-dry, using a clean needle or toothpick to make tiny  micro-\nperforations (pinholes) around the embedded seeds  creates microscopic breathing vents and\nweak lines in the cellulose mat, increasing seedling emergence speed by 30% to 40%!\n9.4 Innovation 4: Natural Kashmiri Bio-Additives (Turmeric & Compost Tea)\nOne common problem when wet seed paper is kept in a damp pot or Petri dish for several days is\nwhite mold (fungus) growing on the wet paper starch. Adding  half a teaspoon of pure turmeric\npowder ( H a l d i )  to the pulp water not only dyes the seed paper a vibrant golden yellow, but\ncurcumin in turmeric is a proven natural antifungal agent that stops mold from attacking the\ngerminating mustard seeds! Similarly, wetting the planted paper with diluted vermicompost water\nprovides instant nitrogen and potassium once the root emerges.\n9.5 Innovation 5: Zero-Cost Upcycled Wooden Mould & Deckle\nInstead of buying expensive commercial papermaking screens, our team constructed a functional\nmould frame using four wooden sticks and fine porous mesh cloth (Step 7). This proves that any\nschool or rural community in Kashmir can replicate our recycling model at near-zero cost.\nSection 10: Mathematical Formulas & Experimental Data\nFramework\nTo score maximum points in  Data Collection/Prototyping (Phase 2)  and  Data Analysis\n(Phase 3) , our documentation must present exact mathematical equations used in seed physiology\nresearch  IJASRM (2019) ,  ICRISAT (2020) ,  Emperador et al. (2024) :\n1. Germination Percentage (GP %) = (Number of Seeds Germinated \xF7 Total Number\nof Seeds Tested) \xD7 100\n2. Mean Germination Time (MGT) = \u2211 (n i  \xD7 d i ) \xF7 N   [where n i  = seeds germinated\non day d i , and N = total germinated seeds]\n3. Seedling Vigour Index (SVI) = Germination Percentage (%) \xD7 Mean Total\nSeedling Length (Root + Shoot in cm)\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 17 of 23',
    tokenCountEstimate: 702
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p18-c18",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 18,
    heading: "4. Phytotoxicity Percentage (%) = [ (Radicle Length of Control \u2212 Radicle Length ",
    text: "4. Phytotoxicity Percentage (%) = [ (Radicle Length of Control \u2212 Radicle Length of\nTreatment) \xF7 Radicle Length of Control ] \xD7 100\n5. Water Absorption Capacity (WAC %) = [ (Wet Mass of Sheet W wet  \u2212 Dry Mass of\nSheet W dry ) \xF7 Dry Mass W dry  ] \xD7 100\nBelow is our structured Experimental Observation Table template showing how we compare our\ntreatments across a 7-day controlled trial (using 25 mustard seeds per sample):\nExperimental\nGroup / Paper\nFormulation\nSeeds\nTested\n(N)\nDays to\nFirst\nSprout\nGerminated\nby Day 7\nGermination\n(%)\nMean\nShoot\nHeight\n(cm)\nObserved\nSheet Behavior\nGroup A1:\nWhatman Filter\nPaper (Petri\nDish Lab\nControl)\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nPure cellulose\nbaseline; instant\ncapillary wetting;\nzero crust\nresistance.\nGroup A2: Bare\nMustard Seeds\nin Natural Soil\n(Soil Control)\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nNatural\nagricultural\nbaseline for\ncomparing paper\ntreatments.\nGroup B1: 100%\nUn-Inked A4\nSeed Paper\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nTests pure\nbleached office\nfiber without any\nink variables.\nGroup B2: 100%\nInked A4 / Test\nNote Seed Paper\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nEvaluates\nwhether printer\ntoner and pen\nink affect\ngermination.\nGroup C1: 50%\nInked A4 + 50%\nCardboard\nBlend\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nTests whether\ncoarse cardboard\nfibers improve\nporosity and\nshoot emergence.\nGroup C2: 50%\nInked A4 + 50%\nSketch/Chart\nPaper\n25 [Record\nDay]\n[Record\nCount]\n[Calculate %] [Measure\ncm]\nTests heavy\nstarch sizing\nbarrier and high\ndensity\nresistance.\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 18 of 23",
    tokenCountEstimate: 432
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p19-c19",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 19,
    heading: "Section 11: Complete Viva-Voce & November 17 Defense Question",
    text: `Section 11: Complete Viva-Voce & November 17 Defense Question
Bank (20 Questions & Simple Answers)
Evaluators often ask sharp, probing questions during Phase 2 and Phase 3 presentations to test
whether every team member (Sadiya, Gufran, and Aatif) truly understands the science or simply
copied a craft video. Memorize these simple, confident answers:
Q1: "You haven't finished growing the plants yet. Why should we give you good marks
on November 17?"
Answer:  "Sir/Ma'am, according to the official DYOD Evaluation Strategy, November 17 is Phase 2
(Project Implementation), while Phase 3 (Project Testing and Data Analysis) is scheduled for
December 22. For Phase 2, we have completed our campus waste collection, contaminant sorting,
material  categorization,  soaking  hydration  setup,  homemade  mould  engineering,  and  a
comprehensive literature and material science study on fiber types and ink phytotoxicity. Our
physical stage-by-stage samples and methodology are ready for inspection today."
Q2: "What is 'watch paper' in a Petri dish and why did your mentor tell you to study it?"
Answer:  "It is Whatman Filter Paper (Grade 1 or Grade 181), which is made of 100% pure cotton
cellulose with zero glue, bleach, or chemicals. In biology labs under International Seed Testing
Association (ISTA) rules, scientists place Whatman filter paper inside a glass Petri dish with 4 mL of
distilled water to test seeds. Our mentor guided us to use this as a pure laboratory control so we can
compare how seeds sprout on pure cellulose versus our recycled inked campus paper without soil
bacteria interfering."
Q3: "Which paper loosens fastest in water, which takes the longest, and why?"
Answer:  "Filter paper and egg trays loosen the fastest (in 5 to 30 minutes) because they have short
fibers and zero waterproofing glue (sizing). A4 and notebook papers take medium time (2 to 6 hours)
because factories add starch sizing and chalk filler so pen ink doesn't bleed. Sketch paper and
corrugated cardboard take the longest (6 to 24 hours) because sketch paper has heavy surface sizing
for wet paint, and cardboard has thick compressed layers and natural wood lignin."
Q4: "Is printer ink on old exam papers toxic to seeds? What is printer ink actually
made of?"
Answer:  "Laser printer and photocopier ink is actually dry toner\u2014a powder made of styrene-acrylate
plastic polymer mixed with carbon black and iron oxide, melted onto the page. Because it is solid
plastic, it does not dissolve in water and cannot be absorbed by plant roots. On normal text pages
(under 15% coverage), it breaks into harmless grey specks and seeds germinate at 92% to 96%.
However, pages with heavy black pictures (>40% coverage) repel water and add microplastics, so we
sort those out."
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 19 of 23`,
    tokenCountEstimate: 717
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p20-c20",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 20,
    heading: 'Q5: "What about student handwriting in ballpoint pens, gel pens, and Pilot liqui',
    text: `Q5: "What about student handwriting in ballpoint pens, gel pens, and Pilot liquid ink
pens?"
Answer:  "Handwriting covers less than 5% of a page's surface. Ballpoint ink is oil-based, so it stays
locked onto the paper fibers and doesn't leach into water. Gel pen ink uses xanthan gum, a natural
sugar biopolymer that is completely safe. Liquid ink pens like Pilot V5 use water-soluble dye that
bleeds into our soaking bucket\u2014and when we drain that dirty soaking water before blending, 75% to
85% of the dye is washed away before it ever touches our seeds!"
Q6: "Why does pure A4 paper sometimes reduce seed growth even if it has no ink at
all?"
Answer:  "Because A4 paper contains 15% to 20% calcium carbonate (chalk) filler and fine bleached
fibers that pack together tightly when drying. If a pure A4 sheet dries out slightly in the pot, it forms a
stiff, cement-like crust that physically blocks the tiny shoot from pushing up, and the chalk raises the
pH above 8.0."
Q7: "How do you fix that A4 crust problem?"
Answer:  "By combining A4 paper in a 50:50 blend with corrugated cardboard or egg tray pulp! The
long, coarse cardboard fibers act as spacers that create microscopic air tunnels in the sheet, holding
moisture like a sponge and giving the mustard roots and shoots easy gaps to push through."
Q8: "What happens if you mix A4 paper with Sketch or Chart paper?"
Answer:  "That creates a very stiff, smooth card that is great for writing on, but poor for seed
germination. Because both A4 and sketch paper contain heavy starch sizing and tightly packed fibers,
the combined sheet absorbs water slowly and acts as a tough barrier that delays or traps seedlings."
Q9: "Why did you choose mustard seeds instead of flower seeds or tomato seeds?"
Answer:  "Three scientific reasons: First, mustard seeds are tiny (1 to 2 mm) and round, so they sit
flat inside thin paper without getting crushed. Second, a 2024 peer-reviewed study by Emperador et
al. proved that mustard seeds achieve a 96.30% germination rate on recycled paper. Third, here in
Kashmir during November, warm-weather seeds like basil or tomato die in the cold, whereas mustard
( Tilgogul / Sarsoon ) is Kashmir's native winter Rabi crop that germinates rapidly in 3 to 5 days even
in cool temperatures!"
Q10: "Why don't the mustard seeds sprout early while the wet paper is drying in your
room?"
Answer:  "For a mustard seed to break its coat and sprout, it needs continuous moisture for 36 to 48
hours. In our process, we only press dry mustard seeds onto the wet pulp at the very end (Step 9),
immediately sponge out the excess water, and air-dry the thin sheet within 12 to 24 hours. The water
evaporates before germination is triggered, keeping the seed safely dormant."
Q11: "Why must you air-dry the seed paper in the shade instead of using a hairdryer,
heater, or hot sun?"
Answer:  "A seed contains a living plant embryo made of delicate proteins and enzymes. Heating wet
seeds above 40\xB0C to 45\xB0C denatures their enzymes and cooks the embryo, killing the seed. Cool,
ventilated room air-drying preserves 100% seed viability."
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 20 of 23`,
    tokenCountEstimate: 802
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p21-c21",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 21,
    heading: 'Q12: "Why did you tear the paper by hand in Step 4 instead of only cutting it wi',
    text: `Q12: "Why did you tear the paper by hand in Step 4 instead of only cutting it with
scissors or a shredder?"
Answer:  "Sharp scissor blades slice straight across cellulose fibers, shortening them and leaving
smooth edges. Tearing wet or dry paper by hand pulls the fibers apart at their natural joints, creating
frayed, feathered ends (fibrillation) that interlock much more strongly when forming a new sheet."
Q13: "Where in India is handmade and seed paper produced, and how is your project
different?"
Answer:  "India's premier government research center is the Kumarappa National Handmade Paper
Institute  (KNHPI)  in  Sanganer,  Jaipur  (under  KVIC,  Ministry  of  MSME),  which  researches
germination papers and waste fibers. Major Indian startups include 21Fools in Mumbai (who made
India's first plantable newspaper), bioQ in New Delhi, and the Gram Art Project in Madhya
Pradesh/Maharashtra. However, commercial Indian companies mostly use clean factory cotton cloth
scraps, whereas our project recycles post-consumer written and printed university paper waste."
Q14: "Is there any historical connection between handmade paper and Kashmir?"
Answer:   "Yes!  In  the  15th  century,  Sultan  Zain-ul-Abidin  (Budshah)  introduced  handmade
papermaking ( Kagazgari ) to Kashmir from Samarkand. Traditional  Koshur  Kagaz  was made in
Nowshera, Srinagar from recycled cotton rags and hemp pulp. Our project connects Kashmir's
historic handmade paper heritage with modern campus sustainability."
Q15:  "Doesn't  using  an  electric  kitchen  blender  use  more  electricity  than  the
environmental value of the paper?"
Answer:  "Because we soak our torn paper strips in a water bucket for 12 to 24 hours first, the water
naturally breaks the hydrogen bonds between fibers. As a result, the blender only needs to run in
short pulses for 15 to 20 seconds per batch, consuming negligible electricity."
Q16: "What is the ideal thickness (GSM) for plantable seed paper?"
Answer:  "Between 120 GSM and 220 GSM (about 0.3 mm to 0.5 mm thick). If a sheet is thinner
than 100 GSM, the 1.5-mm mustard seeds fall out because the fiber layer is too thin to hold them. If it
is thicker than 300 GSM, the sheet becomes too heavy for baby shoots to push through."
Q17: "Why do you remove staples, plastic tape, and laminated covers in Step 2?"
Answer:  "Metal staples rust and destroy blender blades, while plastic tape and lamination films do
not dissolve in water. If blended, plastic turns into microplastics that contaminate the soil when the
paper is planted."
Q18: "What happens to the paper fibers in the soil after the mustard seed sprouts?"
Answer:  "Paper is 85% to 95% natural plant cellulose. Soil microorganisms\u2014especially fungi like
Trichoderma  and bacteria along with earthworms\u2014secrete cellulase enzymes that break the cellulose
down into simple glucose sugars and organic humus within 3 to 8 weeks, enriching the soil and
holding moisture around the roots."
BS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 21 of 23`,
    tokenCountEstimate: 768
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p22-c22",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 22,
    heading: 'Q19: "How long can finished dry seed paper be stored before planting?"',
    text: 'Q19: "How long can finished dry seed paper be stored before planting?"\nAnswer:  "If dried completely and stored in a cool, dry, moisture-free envelope away from direct\nsunlight, mustard seed paper retains high germination viability for 8 to 12 months."\nQ20: "What practical products can IUST make from your seed paper?"\nAnswer:  "University convocation and seminar ID badges, library bookmarks, event invitations,\ndepartment greeting cards, certificate folders, and plantable packaging tags\u2014turning campus waste\ninto zero-waste campus stationery."\nSection 12: Verifiable References & Source Links\n1.  Emperador, A. J., et al. (2024).  "An Evaluation of Recycled Papers as Storage and Germination\nMedium of Vegetable Seeds."  International Journal of Plant & Soil Science , Vol. 36, No. 7, pp. 338\u2013343.\n(Demonstrated 96.30% germination rate of mustard seeds on recycled paper versus 96.30% in control soil).\nSource link:\nhttps://www.researchgate.net/publication/381323066_An_Evaluation_of_Recycled_Papers_as_Storage_\nand_Germination_Medium_of_Vegetable_Seeds\n2.  Cytiva / Whatman Life Sciences (2020).  "Performance Evaluation of Whatman Germination Paper\n(Grade 1 and Grade 3236) According to ISTA Requirements." Application Note CY14858. Source link:\nhttps://cdn.cytivalifesciences.com/api/public/content/digi-17810-pdf\n3.  International Seed Testing Association \u2014 ISTA (2018).  "ISTA Method Validation Reports: Blotter\nand Whatman No. 1 Filter Paper Petri Dish Germination Protocols." Bassersdorf, Switzerland. Source link:\nhttps://www.seedtest.org/api/rm/HF89YW73BD789KQ/ista-method-validation-reports-2018.pdf\n4.  ICRISAT Genebank Manual (2020).  "Managing and Enhancing the Use of Germplasm: Simple Test for\nPaper Quality, Capillary Rise, and Top-of-Paper (Whatman Grade 181 / No. 1) Petri Dish Germination\nMethod." Source link:  http://www.iscgbank.icrisatne.ne/Common/Viewer?ctg=Section&ref=Sec5\n5.  IJASRM (2019).  "Phytotoxic Effect of Paper Mill Effluent Treatment on Seed Germination and Seedling\nGrowth Parameters."  International Journal of Advance Scientific Research and Management , Vol. 4, Issue\n2, pp. 153\u2013160. Source link:  https://ijasrm.com/wp-\ncontent/uploads/2019/02/IJASRM_V4S2_1197_153_160.pdf\n6.  Environment and Ecology (2025).  "Impact of Paper Mill Effluent on Seed Germination, Seedling\nGrowth (Plumule and Radicle Length), and Chlorophyll Content."  Environment and Ecology Journal ,\nAugust 2025, pp. 736\u2013740. Source link:  https://environmentandecology.com/wp-\ncontent/uploads/2025/08/MS20-Impact-of-Paper-Mill-Effluent-on-Seed-Germination.pdf\n7.  Kumarappa National Handmade Paper Institute \u2014 KNHPI (2021).  Official Institutional\nDocumentation, KVIC \u2013 Ministry of Micro, Small and Medium Enterprises, Government of India, Sanganer,\nJaipur. Source link:\nhttps://www.knhpi.org.in/uploads/Tender%20Form%20%20for%20conversion%20of%20Paper%20Carry\n%20Bags%20from%20Handmade%20Paper.pdf\n8.  KNHPI Research & Development Profile (2024).  "Activities of Kumarappa National Handmade\nPaper Institute: Ligno-Cellulosic Raw Materials and Development of Germination Paper (4.3)." Sanganer,\nJaipur. Source link:  https://www.indiamart.com/kumarappa-national-handmadepaper/about-us.html\n9.  Papermart Industry Report (2022).  "KNHPI Develops Handmade Paper from White Currency Waste\n(Dr. Saakshy Agarwal & Moh. Esa Khan, KVIC Jaipur)." Source link:  https://papermart.in/knhpi-develops-\nhandmade-paper-of-white-currency-waste/\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 22 of 23',
    tokenCountEstimate: 887
  },
  {
    id: "doc-dyod-seed-paper-research-viva-compendium-pdf-p23-c23",
    documentId: "doc-dyod-seed-paper-research-viva-compendium-pdf",
    documentTitle: "BS DYOD Term-End Project Literature & Technical Compendium: Waste Paper to Seed Paper",
    category: "Projects",
    subject: "Paper Fiber Science & Plant Phytotoxicity",
    semester: "Term-End Project",
    page: 23,
    heading: '10.  21Fools Sustainable Stationery India (2024).  "Plantable Seed Paper (Beej K',
    text: '10.  21Fools Sustainable Stationery India (2024).  "Plantable Seed Paper (Beej Kapas): GSM\nSpecifications, Seed Varieties, and Growing Protocol." Mumbai, India. Source link:\nhttps://21fools.com/pages/plantable-seed-paper\n11.  21Fools Case Study (2018).  "The First Indian Newspaper That Grows Into a Plant! (Paper Recovery Rate\nin India and Plantable Newspaper Initiative)." Source link:  https://21fools.com/blogs/articles/the-first-\nindian-newspaper-that-grows-into-a-plant\n12.  bioQ Eco Solutions India (2024).  "Plantable Seed Paper India: Handmade Cotton Waste Seed Sheets,\nWater-Based Ink Printing, and Tricolour Badges." New Delhi, India. Source link:  https://bioq.in/plantable-\npaper/\nBS DYOD IUST Awantipora \u2022 Seed Paper Research & Viva Compendium (Sadiya, Gufran, Aatif) Page 23 of 23',
    tokenCountEstimate: 199
  }
];

// server/rag/retrievalService.ts
var COMMON_CONVERSATIONAL_STOP_WORDS = /* @__PURE__ */ new Set([
  "what",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "whose",
  "why",
  "how",
  "tell",
  "me",
  "about",
  "please",
  "give",
  "make",
  "the",
  "is",
  "are",
  "was",
  "were",
  "in",
  "on",
  "at",
  "by",
  "for",
  "with",
  "about",
  "against",
  "between",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "to",
  "from",
  "up",
  "down",
  "and",
  "or",
  "an",
  "a",
  "can",
  "you",
  "does",
  "do",
  "did",
  "this",
  "that",
  "so",
  "just",
  "my",
  "include",
  "included",
  "including",
  "contain",
  "contains",
  "list",
  "show",
  "describe"
]);
var RetrievalService = class {
  miniSearch;
  chunksMap = /* @__PURE__ */ new Map();
  documentsMap = /* @__PURE__ */ new Map();
  isLoaded = false;
  baseDir;
  MIN_SCORE_THRESHOLD = 8;
  constructor(baseDir) {
    this.baseDir = baseDir || process.cwd();
    this.miniSearch = new MiniSearch({
      fields: ["text", "heading", "documentTitle", "subject", "category"],
      storeFields: [
        "id",
        "documentId",
        "documentTitle",
        "category",
        "subject",
        "semester",
        "page",
        "heading",
        "text",
        "tokenCountEstimate"
      ],
      searchOptions: {
        boost: { heading: 3.5, documentTitle: 2.5, subject: 2, text: 1 },
        prefix: true,
        fuzzy: 0.2,
        combineWith: "OR"
      }
    });
  }
  async initialize() {
    try {
      let metadataList = metadata_default;
      let chunksList = chunks_default;
      const chunksPath = path.join(this.baseDir, "knowledge_base", "chunks", "chunks.json");
      const metaPath = path.join(this.baseDir, "knowledge_base", "processed", "metadata.json");
      if (fs.existsSync(chunksPath) && fs.existsSync(metaPath)) {
        try {
          metadataList = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          chunksList = JSON.parse(fs.readFileSync(chunksPath, "utf-8"));
        } catch {
        }
      }
      this.documentsMap.clear();
      for (const meta of metadataList) {
        this.documentsMap.set(meta.id, meta);
      }
      this.chunksMap.clear();
      this.miniSearch.removeAll();
      const approvedChunks = chunksList.filter((chunk) => {
        const doc = this.documentsMap.get(chunk.documentId);
        return doc && doc.verificationStatus === "Approved";
      });
      for (const chunk of approvedChunks) {
        this.chunksMap.set(chunk.id, chunk);
      }
      if (approvedChunks.length > 0) {
        this.miniSearch.addAll(approvedChunks);
      }
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to initialize RetrievalService:", err.message);
      this.isLoaded = true;
    }
  }
  expandQuery(rawQuery) {
    const lower = rawQuery.toLowerCase().trim();
    let expanded = lower;
    let boostCategory = void 0;
    expanded = expanded.replace(/\beight\b/g, "8 eight");
    expanded = expanded.replace(/\bseven\b/g, "7 seven");
    expanded = expanded.replace(/\bsix\b/g, "6 six");
    expanded = expanded.replace(/\bfour\b/g, "4 four");
    expanded = expanded.replace(/\bthree\b/g, "3 three");
    expanded = expanded.replace(/\btwo\b/g, "2 two");
    expanded = expanded.replace(/\bone\b/g, "1 one");
    const stripped = lower.replace(/^(so|tell me|can you explain|what is|what are|explain)\s+/i, "").trim();
    if (/\b(what is dyod|about dyod|meaning of dyod|define dyod|what dyod means|why dyod|design your own degree)\b/i.test(
      lower
    ) || stripped === "dyod") {
      expanded += ' "Design your own degree" DYOD IUST "Why Design your own degree" "Academic Scheme" multidisciplinary degree';
      boostCategory = "Programme Information";
    }
    if (/\b(basket|baskets|8 baskets|eight baskets)\b/i.test(lower)) {
      expanded += ' "Course Baskets" "Basket number" "8 baskets" "Natural Sciences" "Mathematical Sciences" "Computing and Data Science" "Humanities" "Engineering" "Sustainability" "Design" "Wellness"';
      boostCategory = "Programme Information";
    }
    if (/\b(structure|framework|curriculum|scheme|modalities)\b/i.test(lower)) {
      expanded += ' "Academic Scheme" "Semester-wise Structure" "DYOD@IUST - Basic Modalities" credits duration';
      boostCategory = "Programme Information";
    }
    if (/\b(subject|subjects|course|courses|syllabus)\b/i.test(lower)) {
      expanded += ' "Academic Scheme -Semester-I" "Academic Scheme -Semester-II" "Courses and Courses Basket Mapping" "Sample Course Content"';
      boostCategory = "Programme Information";
    }
    if (/\b(evaluation|rubric|viva|assessment|phases|marks|score)\b/i.test(lower)) {
      expanded += ' "Evaluation Strategy" "Term-End Project" "Phase" "Rubric" viva';
      boostCategory = "Examination and Assessment";
    }
    if (/\b(seed paper|waste paper|pulp|deckle|mesh|soaking|blending|drying)\b/i.test(lower)) {
      expanded += ' "Waste Paper to Seed Paper" methodology practical pulping';
      boostCategory = "Practical Work";
    }
    return { expandedText: expanded, boostCategory };
  }
  retrieve(query, topK = 6) {
    if (!this.isLoaded) {
      return {
        query,
        expandedQuery: query,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: "Knowledge base index not loaded"
      };
    }
    const cleanedQuery = query.replace(/[^\w\s-]/g, " ").trim();
    if (!cleanedQuery) {
      return {
        query,
        expandedQuery: query,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: "Empty query"
      };
    }
    const { expandedText, boostCategory } = this.expandQuery(cleanedQuery);
    const substantiveKeywords = cleanedQuery.toLowerCase().split(/\s+/).filter((w) => w.length >= 3 && !COMMON_CONVERSATIONAL_STOP_WORDS.has(w));
    const rawResults = this.miniSearch.search(expandedText);
    if (rawResults.length === 0) {
      return {
        query,
        expandedQuery: expandedText,
        targetCategory: boostCategory,
        chunks: [],
        scores: {},
        maxScore: 0,
        sufficientEvidence: false,
        topicTermMatches: 0,
        thresholdPassed: false,
        refusalReason: "No matching chunks found in BM25 index"
      };
    }
    const scoredResults = rawResults.map((res) => {
      const chunk = this.chunksMap.get(res.id);
      let adjustedScore = res.score;
      if (chunk && boostCategory && chunk.category === boostCategory) {
        adjustedScore *= 2.5;
      }
      return { ...res, score: adjustedScore, chunk };
    });
    scoredResults.sort((a, b) => b.score - a.score);
    const maxScore = scoredResults[0]?.score || 0;
    const topResults = scoredResults.slice(0, topK);
    const chunks = [];
    const scores = {};
    for (const res of topResults) {
      scores[res.id] = res.score;
      if (res.chunk) {
        chunks.push(res.chunk);
      }
    }
    let topicTermMatches = 0;
    if (substantiveKeywords.length > 0) {
      const combinedRetrievedText = chunks.map((c) => `${c.heading} ${c.text}`).join(" ").toLowerCase();
      for (const word of substantiveKeywords) {
        const stem = word.endsWith("ies") ? word.slice(0, -3) + "y" : word.endsWith("es") ? word.slice(0, -2) : word.endsWith("s") ? word.slice(0, -1) : word;
        const altStem = word.startsWith("program") ? "program" : stem;
        if (combinedRetrievedText.includes(word) || combinedRetrievedText.includes(stem) || combinedRetrievedText.includes(altStem)) {
          topicTermMatches++;
        }
      }
    }
    const thresholdPassed = maxScore >= this.MIN_SCORE_THRESHOLD && chunks.length > 0;
    let hasSubstantiveEvidence = false;
    if (boostCategory !== void 0 && maxScore >= this.MIN_SCORE_THRESHOLD * 2) {
      hasSubstantiveEvidence = true;
    } else if (substantiveKeywords.length >= 3) {
      hasSubstantiveEvidence = topicTermMatches >= 1;
    } else if (substantiveKeywords.length > 0) {
      hasSubstantiveEvidence = topicTermMatches >= 1 || maxScore >= 30;
    } else {
      hasSubstantiveEvidence = thresholdPassed;
    }
    const sufficientEvidence = thresholdPassed && hasSubstantiveEvidence;
    let refusalReason = void 0;
    if (!thresholdPassed) {
      refusalReason = `Max BM25 score (${maxScore.toFixed(1)}) below minimum threshold (${this.MIN_SCORE_THRESHOLD})`;
    } else if (!hasSubstantiveEvidence) {
      refusalReason = `Substantive topic keywords [${substantiveKeywords.join(", ")}] not adequately represented in retrieved chunks`;
    }
    return {
      query,
      expandedQuery: expandedText,
      targetCategory: boostCategory,
      chunks,
      scores,
      maxScore,
      sufficientEvidence,
      topicTermMatches,
      thresholdPassed,
      refusalReason
    };
  }
  getDocuments() {
    return Array.from(this.documentsMap.values());
  }
  getApprovedChunkCount() {
    return this.chunksMap.size;
  }
};

// server/api/sources.ts
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  const retrieval = new RetrievalService();
  await retrieval.initialize();
  const docs = retrieval.getDocuments();
  const sanitizedDocs = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    subject: d.subject || "General DYOD Curriculum",
    semester: d.semester || "Undergraduate",
    academicYear: d.academicYear || "2024-2028",
    verificationStatus: d.verificationStatus,
    pageCount: d.pageCount,
    summary: d.summary || ""
  }));
  return res.status(200).json({
    count: sanitizedDocs.length,
    approvedCount: sanitizedDocs.filter((d) => d.verificationStatus === "Approved").length,
    sources: sanitizedDocs
  });
}
export {
  handler as default
};
