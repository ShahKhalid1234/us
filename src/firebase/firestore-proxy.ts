import {
  doc as realDoc,
  collection as realCollection,
  getDoc as realGetDoc,
  getDocs as realGetDocs,
  setDoc as realSetDoc,
  addDoc as realAddDoc,
  updateDoc as realUpdateDoc,
  deleteDoc as realDeleteDoc,
  query as realQuery,
  where as realWhere,
  orderBy as realOrderBy,
  onSnapshot as realOnSnapshot,
  limit as realLimit,
  increment as realIncrement,
  arrayUnion as realArrayUnion,
  arrayRemove as realArrayRemove
} from 'firebase/firestore';

export { Timestamp } from 'firebase/firestore';

// Pub-sub registry for instant multi-component local-tab updates
type MockDBListener = () => void;
const listeners: Set<MockDBListener> = new Set();

export const triggerMockDBUpdate = () => {
  listeners.forEach(listener => {
    try {
      listener();
    } catch (e) {
      console.error("Error in mock DB listener:", e);
    }
  });
};

// Sync updates across tabs/frames via storage events (great for dual Romeo/Juliet screens)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('mock_db_')) {
      triggerMockDBUpdate();
    }
  });
}

export const isMockActive = (): boolean => {
  const bypass = localStorage.getItem('bypass_verification') === 'true';
  const hasDemoToken = localStorage.getItem('demo_user_active') === 'true';
  return bypass || hasDemoToken;
};

// Local storage helpers
const getMockCollection = (path: string): Record<string, any> => {
  const key = `mock_db_${path.replace(/\//g, '___')}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : {};
};

const saveMockCollection = (path: string, data: Record<string, any>) => {
  const key = `mock_db_${path.replace(/\//g, '___')}`;
  localStorage.setItem(key, JSON.stringify(data));
  triggerMockDBUpdate();
};

// Mock classes to preserve SDK signatures
export class MockDocumentReference {
  constructor(public path: string, public id: string) {}
}

export class MockCollectionReference {
  constructor(public path: string) {}
}

export class MockQuery {
  constructor(public collectionRef: MockCollectionReference, public constraints: any[] = []) {}
}

export class MockDocumentSnapshot {
  constructor(private _exists: boolean, private _path: string, private _id: string, private _data: any) {}
  
  exists() {
    return this._exists;
  }
  
  data() {
    return this._data;
  }
  
  get id() {
    return this._id;
  }
  
  get ref() {
    return new MockDocumentReference(this._path, this._id);
  }
}

export class MockQuerySnapshot {
  constructor(public docs: MockDocumentSnapshot[]) {}
  
  get empty() {
    return this.docs.length === 0;
  }
  
  forEach(callback: (doc: MockDocumentSnapshot) => void) {
    this.docs.forEach(callback);
  }
}

// Proxied Functions
export function doc(dbOrCollection: any, ...args: string[]): any {
  if (!isMockActive()) {
    try {
      return (realDoc as any)(dbOrCollection, ...args);
    } catch (e) {
      console.warn("Creating mock DocRef after real doc initialization failed:", e);
    }
  }
  
  let path = '';
  if (dbOrCollection instanceof MockCollectionReference) {
    path = dbOrCollection.path + '/' + args[0];
  } else if (typeof dbOrCollection === 'string') {
    path = dbOrCollection + '/' + args.join('/');
  } else if (dbOrCollection?.path) {
    path = dbOrCollection.path + '/' + args.join('/');
  } else {
    path = args.join('/');
  }
  const parts = path.split('/');
  const id = parts[parts.length - 1];
  return new MockDocumentReference(path, id);
}

export function collection(dbOrDoc: any, ...args: string[]): any {
  if (!isMockActive()) {
    try {
      return (realCollection as any)(dbOrDoc, ...args);
    } catch (e) {
      console.warn("Creating mock CollectionRef after real collection initialization failed:", e);
    }
  }
  
  let path = '';
  if (dbOrDoc instanceof MockDocumentReference) {
    path = dbOrDoc.path + '/' + args[0];
  } else if (dbOrDoc?.path) {
    path = dbOrDoc.path + '/' + args.join('/');
  } else {
    path = args.join('/');
  }
  return new MockCollectionReference(path);
}

export function query(collectionRef: any, ...constraints: any[]): any {
  if (!isMockActive() && !(collectionRef instanceof MockCollectionReference)) {
    try {
      return (realQuery as any)(collectionRef, ...constraints);
    } catch (e) {
      console.warn("Creating mock Query after real query failed:", e);
    }
  }
  return new MockQuery(
    collectionRef instanceof MockCollectionReference ? collectionRef : new MockCollectionReference(collectionRef.path),
    constraints
  );
}

export function where(fieldPath: string, opStr: string, value: any) {
  if (!isMockActive()) {
    try {
      return realWhere(fieldPath, opStr as any, value);
    } catch (e) {}
  }
  return { type: 'where', fieldPath, opStr, value };
}

export function orderBy(fieldPath: string, directionStr: 'asc' | 'desc' = 'asc') {
  if (!isMockActive()) {
    try {
      return realOrderBy(fieldPath, directionStr);
    } catch (e) {}
  }
  return { type: 'orderBy', fieldPath, directionStr };
}

export function limit(limitNum: number) {
  if (!isMockActive()) {
    try {
      return realLimit(limitNum);
    } catch (e) {}
  }
  return { type: 'limit', limitNum };
}

export async function getDoc(docRef: any): Promise<any> {
  if (!isMockActive() && !(docRef instanceof MockDocumentReference)) {
    try {
      return await realGetDoc(docRef);
    } catch (e) {
      console.warn("Real getDoc failed, falling back to local DB sandbox:", e);
    }
  }
  
  const path = docRef.path;
  const id = docRef.id;
  const parts = path.split('/');
  const collectionPath = parts.slice(0, -1).join('/');
  const collectionData = getMockCollection(collectionPath);
  const data = collectionData[id];
  return new MockDocumentSnapshot(!!data, path, id, data);
}

export async function setDoc(docRef: any, data: any, options?: any): Promise<void> {
  if (!isMockActive() && !(docRef instanceof MockDocumentReference)) {
    try {
      await realSetDoc(docRef, data, options);
      return;
    } catch (e) {
      console.warn("Real setDoc failed, falling back to local DB sandbox:", e);
    }
  }
  
  const path = docRef.path;
  const id = docRef.id;
  const parts = path.split('/');
  const collectionPath = parts.slice(0, -1).join('/');
  const collectionData = getMockCollection(collectionPath);
  
  let newData = { ...data };
  if (options?.merge && collectionData[id]) {
    newData = mergeDeep(collectionData[id], data);
  }
  
  collectionData[id] = newData;
  saveMockCollection(collectionPath, collectionData);
}

export async function addDoc(collectionRef: any, data: any): Promise<any> {
  if (!isMockActive() && !(collectionRef instanceof MockCollectionReference)) {
    try {
      return await realAddDoc(collectionRef, data);
    } catch (e) {
      console.warn("Real addDoc failed, falling back to local DB sandbox:", e);
    }
  }
  
  const path = collectionRef.path;
  const id = Math.random().toString(36).substring(2, 15);
  const docRef = new MockDocumentReference(path + '/' + id, id);
  await setDoc(docRef, { ...data, id });
  return docRef;
}

export async function updateDoc(docRef: any, dataOrField: any, ...args: any[]): Promise<void> {
  if (!isMockActive() && !(docRef instanceof MockDocumentReference)) {
    try {
      await (realUpdateDoc as any)(docRef, dataOrField, ...args);
      return;
    } catch (e) {
      console.warn("Real updateDoc failed, falling back to local DB sandbox:", e);
    }
  }
  
  const path = docRef.path;
  const id = docRef.id;
  const parts = path.split('/');
  const collectionPath = parts.slice(0, -1).join('/');
  const collectionData = getMockCollection(collectionPath);
  
  if (!collectionData[id]) {
    collectionData[id] = {};
  }
  
  let updates: Record<string, any> = {};
  if (typeof dataOrField === 'string') {
    updates[dataOrField] = args[0];
  } else {
    updates = dataOrField;
  }
  
  const targetDoc = collectionData[id];
  Object.keys(updates).forEach(key => {
    const val = updates[key];
    
    if (val && val.__type === 'increment') {
      const currentVal = Number(getNestedValue(targetDoc, key) || 0);
      setNestedValue(targetDoc, key, currentVal + val.value);
    } else if (val && val.__type === 'arrayUnion') {
      const currentArray = Array.isArray(getNestedValue(targetDoc, key)) ? getNestedValue(targetDoc, key) : [];
      const newArray = [...currentArray];
      val.values.forEach((item: any) => {
        if (!newArray.includes(item)) newArray.push(item);
      });
      setNestedValue(targetDoc, key, newArray);
    } else if (val && val.__type === 'arrayRemove') {
      const currentArray = Array.isArray(getNestedValue(targetDoc, key)) ? getNestedValue(targetDoc, key) : [];
      const newArray = currentArray.filter((item: any) => !val.values.includes(item));
      setNestedValue(targetDoc, key, newArray);
    } else {
      setNestedValue(targetDoc, key, val);
    }
  });
  
  saveMockCollection(collectionPath, collectionData);
}

export async function deleteDoc(docRef: any): Promise<void> {
  if (!isMockActive() && !(docRef instanceof MockDocumentReference)) {
    try {
      await realDeleteDoc(docRef);
      return;
    } catch (e) {
      console.warn("Real deleteDoc failed, falling back to local DB sandbox:", e);
    }
  }
  
  const path = docRef.path;
  const id = docRef.id;
  const parts = path.split('/');
  const collectionPath = parts.slice(0, -1).join('/');
  const collectionData = getMockCollection(collectionPath);
  delete collectionData[id];
  saveMockCollection(collectionPath, collectionData);
}

export async function getDocs(queryOrRef: any): Promise<any> {
  if (!isMockActive() && !(queryOrRef instanceof MockQuery) && !(queryOrRef instanceof MockCollectionReference)) {
    try {
      return await realGetDocs(queryOrRef);
    } catch (e) {
      console.warn("Real getDocs failed, falling back to local DB sandbox:", e);
    }
  }
  
  let path = '';
  let constraints: any[] = [];
  
  if (queryOrRef instanceof MockQuery) {
    path = queryOrRef.collectionRef.path;
    constraints = queryOrRef.constraints;
  } else if (queryOrRef instanceof MockCollectionReference) {
    path = queryOrRef.path;
  } else if (queryOrRef?.path) {
    path = queryOrRef.path;
  }
  
  const collectionData = getMockCollection(path);
  let documents = Object.keys(collectionData).map(id => {
    return new MockDocumentSnapshot(true, path + '/' + id, id, collectionData[id]);
  });
  
  constraints.forEach(c => {
    if (!c) return;
    if (c.type === 'where') {
      documents = documents.filter(doc => {
        const data = doc.data();
        if (!data) return false;
        const val = getNestedValue(data, c.fieldPath);
        
        switch (c.opStr) {
          case '==': return val === c.value;
          case '!=': return val !== c.value;
          case '>': return val > c.value;
          case '>=': return val >= c.value;
          case '<': return val < c.value;
          case '<=': return val <= c.value;
          case 'array-contains': 
            return Array.isArray(val) && val.includes(c.value);
          case 'in':
            return Array.isArray(c.value) && c.value.includes(val);
          default: return false;
        }
      });
    }
  });
  
  constraints.forEach(c => {
    if (!c) return;
    if (c.type === 'orderBy') {
      documents.sort((a, b) => {
        const valA = getNestedValue(a.data(), c.fieldPath);
        const valB = getNestedValue(b.data(), c.fieldPath);
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        
        if (valA < valB) return c.directionStr === 'asc' ? -1 : 1;
        if (valA > valB) return c.directionStr === 'asc' ? 1 : -1;
        return 0;
      });
    }
  });
  
  constraints.forEach(c => {
    if (!c) return;
    if (c.type === 'limit') {
      documents = documents.slice(0, c.limitNum);
    }
  });
  
  return new MockQuerySnapshot(documents);
}

export function onSnapshot(
  queryOrRef: any,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  const isMock = isMockActive() || 
                 (queryOrRef instanceof MockQuery) || 
                 (queryOrRef instanceof MockDocumentReference) || 
                 (queryOrRef instanceof MockCollectionReference);
  
  if (!isMock) {
    try {
      return realOnSnapshot(queryOrRef, onNext, onError);
    } catch (e) {
      console.warn("Real onSnapshot failed, falling back to local DB sandbox:", e);
    }
  }
  
  const triggerUpdate = async () => {
    try {
      if (queryOrRef instanceof MockDocumentReference || (queryOrRef?.path && !queryOrRef?.collectionRef)) {
        const docRef = queryOrRef instanceof MockDocumentReference ? queryOrRef : new MockDocumentReference(queryOrRef.path, queryOrRef.id);
        const snap = await getDoc(docRef);
        onNext(snap);
      } else {
        const snap = await getDocs(queryOrRef);
        onNext(snap);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };
  
  triggerUpdate();
  listeners.add(triggerUpdate);
  
  return () => {
    listeners.delete(triggerUpdate);
  };
}

export function increment(n: number) {
  if (!isMockActive()) {
    try {
      return realIncrement(n);
    } catch (e) {}
  }
  return { __type: 'increment', value: n };
}

export function arrayUnion(...elements: any[]) {
  if (!isMockActive()) {
    try {
      return realArrayUnion(...elements);
    } catch (e) {}
  }
  return { __type: 'arrayUnion', values: elements };
}

export function arrayRemove(...elements: any[]) {
  if (!isMockActive()) {
    try {
      return realArrayRemove(...elements);
    } catch (e) {}
  }
  return { __type: 'arrayRemove', values: elements };
}

// Low level helpers
function mergeDeep(target: any, source: any) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item: any) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function setNestedValue(obj: any, path: string, value: any) {
  const parts = path.split('.');
  const last = parts.pop()!;
  const target = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);
  target[last] = value;
}
