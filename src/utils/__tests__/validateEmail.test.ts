import { sanitizeEmail, validateEmail } from '../index';

// Bug report (QA, Ray): some users can't log in because the app says "invalid email".
// Reported users: Luigi Carluccio and John Silva. Their emails are copied from db.json.
describe('validateEmail', () => {
    describe('users reported by QA (the bug)', () => {
        it.each([
            ['Luigi Carluccio', 'luigi@carluccio.it'],
            ['John Silva', 'john@silva.com.br'],
        ])('accepts the email of %s (%s)', (_name, email) => {
            expect(validateEmail(email)).toBe(true);
        });
    });

    describe('every registered user can pass the email check', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const db = require('../../../db.json');
        const emails: string[] = db.users.map((user: { email: string }) => user.email);

        it.each(emails)('accepts %s', (email) => {
            expect(validateEmail(email)).toBe(true);
        });
    });

    describe('other valid emails', () => {
        it.each([
            ['a .com address', 'ulla.ulriksen@example.com'],
            ['a 2-letter country domain', 'someone@example.ca'],
            ['a 2-letter country domain after a second-level domain', 'someone@example.co.uk'],
            ['a 4-letter domain', 'someone@example.info'],
            ['a long domain', 'someone@example.travel'],
            ['a subdomain', 'someone@mail.example.org'],
            ['a hyphen in the domain', 'someone@my-company.com'],
            ['a hyphen and an underscore in the name', 'first-last_name@example.com'],
            ['a plus tag in the name', 'someone+volunteam@example.com'],
            ['digits', 'user123@example123.com'],
            ['uppercase letters', 'Luigi@Carluccio.IT'],
            ['spaces around it', '  luigi@carluccio.it  '],
        ])('accepts %s (%s)', (_case, email) => {
            expect(validateEmail(email)).toBe(true);
        });
    });

    describe('invalid emails are still rejected', () => {
        it.each([
            ['an empty string', ''],
            ['only spaces', '   '],
            ['no @', 'luigi.carluccio.it'],
            ['no name before @', '@carluccio.it'],
            ['no domain after @', 'luigi@'],
            ['no dot in the domain', 'luigi@carluccio'],
            ['a 1-letter ending', 'luigi@carluccio.i'],
            ['a domain ending in a dot', 'luigi@carluccio.it.'],
            ['two dots in a row', 'luigi@carluccio..it'],
            ['a name starting with a dot', '.luigi@carluccio.it'],
            ['two @ signs', 'luigi@@carluccio.it'],
            ['a space inside', 'luigi carluccio@carluccio.it'],
            ['digits in the ending', 'luigi@carluccio.123'],
        ])('rejects %s (%s)', (_case, email) => {
            expect(validateEmail(email)).toBe(false);
        });
    });

    // 30 characters is enough to show the slowdown in the old regex without hanging the test run.
    it('answers quickly for a long invalid input (no regex freeze)', () => {
        const longInput = 'a'.repeat(30) + '!';
        const start = Date.now();
        validateEmail(longInput);
        validateEmail(`${'a.'.repeat(40)}@${'b-'.repeat(40)}!`);
        expect(Date.now() - start).toBeLessThan(100);
    });
});

describe('sanitizeEmail', () => {
    it('trims spaces and lowercases', () => {
        expect(sanitizeEmail('  John@Silva.COM.br ')).toBe('john@silva.com.br');
    });
});
