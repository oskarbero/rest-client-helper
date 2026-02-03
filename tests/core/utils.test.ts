import { describe, it, expect } from 'vitest';
import { findNodeById, isValidUrl, deepEqual, type CollectionNode } from '@core';

describe('utils', () => {
  describe('isValidUrl', () => {
    it('should return true for https URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
    });

    it('should return true for http URL', () => {
      expect(isValidUrl('http://example.com')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(isValidUrl('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(isValidUrl('   ')).toBe(false);
    });

    it('should return false for non-http(s) protocol', () => {
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });

    it('should return true when protocol is added (e.g. example.com)', () => {
      expect(isValidUrl('example.com')).toBe(true);
    });
  });

  describe('deepEqual', () => {
    it('should return true for two equal objects', () => {
      const a = { x: 1, y: { z: 2 } };
      const b = { x: 1, y: { z: 2 } };
      expect(deepEqual(a, b)).toBe(true);
    });

    it('should return false for two different objects', () => {
      const a = { x: 1 };
      const b = { x: 2 };
      expect(deepEqual(a, b)).toBe(false);
    });

    it('should return false when one is null and the other is object', () => {
      expect(deepEqual(null, {})).toBe(false);
      expect(deepEqual({}, null)).toBe(false);
    });

    it('should return false for array vs object', () => {
      expect(deepEqual([], {})).toBe(false);
    });

    it('should return true for same reference', () => {
      const a = { x: 1 };
      expect(deepEqual(a, a)).toBe(true);
    });
  });

  describe('findNodeById', () => {
    it('should find a node by id in flat list', () => {
      const nodes: CollectionNode[] = [
        { id: 'a', name: 'A', type: 'request', createdAt: '', updatedAt: '' },
        { id: 'b', name: 'B', type: 'request', createdAt: '', updatedAt: '' },
      ];
      const found = findNodeById(nodes, 'b');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('b');
      expect(found?.name).toBe('B');
    });

    it('should find a node by id in nested children', () => {
      const nodes: CollectionNode[] = [
        {
          id: 'root',
          name: 'Root',
          type: 'collection',
          createdAt: '',
          updatedAt: '',
          children: [
            {
              id: 'child',
              name: 'Child',
              type: 'request',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      ];
      const found = findNodeById(nodes, 'child');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('child');
    });

    it('should return null when id is not found', () => {
      const nodes: CollectionNode[] = [
        { id: 'a', name: 'A', type: 'request', createdAt: '', updatedAt: '' },
      ];
      expect(findNodeById(nodes, 'missing')).toBeNull();
    });
  });
});
