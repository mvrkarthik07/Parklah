// Pure JS hashing to avoid native module issues on Windows
import bcrypt from 'bcryptjs';

export const hash = (s: string) => bcrypt.hash(s, 12);
export const compare = (s: string, h: string) => bcrypt.compare(s, h);
