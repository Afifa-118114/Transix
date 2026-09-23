import assert from "node:assert";
import {
  formatRoomArrangement,
  getRoomArrangementOptions,
  parseRoomArrangement,
} from "../src/utils/roomArrangement.js";

console.log("Starting Room Arrangement Unit Tests...\n");

// 1. Verify getRoomArrangementOptions
console.log("Test 1: getRoomArrangementOptions for 2 travelers");
const opt2 = getRoomArrangementOptions(2);
console.log("2 travelers options:", opt2.map(o => o.label));
assert.ok(opt2.some(o => o.value.length === 1 && o.value[0] === 2), "Should include 2 sharing");
assert.ok(opt2.some(o => o.value.length === 2 && o.value[0] === 1 && o.value[1] === 1), "Should include 1 + 1");
opt2.forEach(o => {
  const sum = o.value.reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 2, `Option ${o.label} sum must be 2`);
});
console.log("✓ Passed: 2 travelers options valid");

console.log("\nTest 2: getRoomArrangementOptions for 3 travelers");
const opt3 = getRoomArrangementOptions(3);
console.log("3 travelers options:", opt3.map(o => o.label));
assert.ok(opt3.some(o => o.label.includes("2 + 1")), "Should include 2 + 1");
assert.ok(opt3.some(o => o.value.length === 1 && o.value[0] === 3), "Should include 3 sharing");
assert.ok(opt3.some(o => o.value.every(v => v === 1)), "Should include 1 room each");
opt3.forEach(o => {
  const sum = o.value.reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 3, `Option ${o.label} sum must be 3`);
});
console.log("✓ Passed: 3 travelers options valid");

console.log("\nTest 3: getRoomArrangementOptions for 4 travelers");
const opt4 = getRoomArrangementOptions(4);
console.log("4 travelers options:", opt4.map(o => o.label));
assert.ok(opt4.some(o => o.label.includes("2 + 2")), "Should include 2 + 2");
assert.ok(opt4.some(o => o.label.includes("2 + 1 + 1")), "Should include 2 + 1 + 1");
assert.ok(opt4.some(o => o.label.includes("3 + 1")), "Should include 3 + 1");
opt4.forEach(o => {
  const sum = o.value.reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 4, `Option ${o.label} sum must be 4`);
});
console.log("✓ Passed: 4 travelers options valid");

console.log("\nTest 4: getRoomArrangementOptions for 5 travelers");
const opt5 = getRoomArrangementOptions(5);
console.log("5 travelers options:", opt5.map(o => o.label));
opt5.forEach(o => {
  const sum = o.value.reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, 5, `Option ${o.label} sum must be 5`);
});
console.log("✓ Passed: 5 travelers options valid");

// 2. Verify parseRoomArrangement
console.log("\nTest 5: parseRoomArrangement valid inputs");
assert.deepStrictEqual(parseRoomArrangement("2 + 1", 3), [2, 1]);
assert.deepStrictEqual(parseRoomArrangement("2+1", 3), [2, 1]);
assert.deepStrictEqual(parseRoomArrangement("2, 1", 3), [2, 1]);
assert.deepStrictEqual(parseRoomArrangement("2 and 1", 3), [2, 1]);
assert.deepStrictEqual(parseRoomArrangement("3 sharing one room", 3), [3]);
assert.deepStrictEqual(parseRoomArrangement("3", 3), [3]);
assert.deepStrictEqual(parseRoomArrangement("1 room each", 3), [1, 1, 1]);
assert.deepStrictEqual(parseRoomArrangement("2 + 2", 4), [2, 2]);
assert.deepStrictEqual(parseRoomArrangement("1 + 1", 2), [1, 1]);
assert.deepStrictEqual(parseRoomArrangement("2 + 2 + 1", 5), [2, 2, 1]);
console.log("✓ Passed: All valid inputs parsed correctly");

console.log("\nTest 6: parseRoomArrangement invalid inputs (rejected)");
assert.strictEqual(parseRoomArrangement("2 + 2", 3), null, "Sum 4 for 3 travelers must be null");
assert.strictEqual(parseRoomArrangement("1 + 1", 3), null, "Sum 2 for 3 travelers must be null");
assert.strictEqual(parseRoomArrangement("0 + 3", 3), null, "Zero occupants must be null");
assert.strictEqual(parseRoomArrangement("-1 + 4", 3), null, "Negative occupants must be null");
assert.strictEqual(parseRoomArrangement("random text", 3), null, "Non-number text must be null");
console.log("✓ Passed: All invalid inputs properly rejected");

// 3. Verify formatRoomArrangement
console.log("\nTest 7: formatRoomArrangement display strings");
assert.strictEqual(formatRoomArrangement([2, 1]), "2 + 1 (2 rooms)");
assert.strictEqual(formatRoomArrangement([3]), "3 sharing one room");
assert.strictEqual(formatRoomArrangement([1, 1, 1]), "1 room each (3 rooms)");
assert.strictEqual(formatRoomArrangement([2, 2]), "2 + 2 (2 rooms)");
assert.strictEqual(formatRoomArrangement([]), "");
console.log("✓ Passed: Formatting helper produces clean, human-readable labels");

console.log("\nALL ROOM ARRANGEMENT UTILITY TESTS PASSED! 🎉");
