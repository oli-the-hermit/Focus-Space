//! Password hashing and session tokens. Byte-compatible with `server/crypto.js`,
//! so a database created by the web version logs in from the desktop app.

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::{Digest, Sha256};
use subtle::ConstantTimeEq;

const PBKDF2_ITERATIONS: u32 = 310_000;
const KEY_LEN: usize = 32;
const SALT_BYTES: usize = 16;

/// PBKDF2-HMAC-SHA256. Uses `salt_hex` when given, otherwise a fresh random salt.
/// Returns `(salt_hex, hash_hex)`.
pub fn hash_password(password: &str, salt_hex: Option<&str>) -> Result<(String, String), hex::FromHexError> {
    let salt = match salt_hex {
        Some(h) => hex::decode(h)?,
        None => {
            let mut s = vec![0u8; SALT_BYTES];
            rand::thread_rng().fill_bytes(&mut s);
            s
        }
    };
    let mut key = [0u8; KEY_LEN];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), &salt, PBKDF2_ITERATIONS, &mut key);
    Ok((hex::encode(&salt), hex::encode(key)))
}

/// Constant-time check of `password` against a stored salt + hash.
pub fn verify_password(password: &str, salt_hex: &str, expected_hash_hex: &str) -> bool {
    let Ok((_, hash)) = hash_password(password, Some(salt_hex)) else {
        return false;
    };
    match (hex::decode(hash), hex::decode(expected_hash_hex)) {
        (Ok(a), Ok(b)) => a.len() == b.len() && bool::from(a.ct_eq(&b)),
        _ => false,
    }
}

/// 32 random bytes, base64url without padding (same as Node's `toString('base64url')`).
pub fn generate_token() -> String {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

/// SHA-256 hex digest; only token hashes are stored.
pub fn hash_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Expected values were produced with Node's `crypto` module.
    #[test]
    fn pbkdf2_matches_node() {
        let (salt, hash) = hash_password("correct horse battery", Some("00112233445566778899aabbccddeeff")).unwrap();
        assert_eq!(salt, "00112233445566778899aabbccddeeff");
        assert_eq!(hash, "59158bdbc688a1a5007389132ad47d784644b81b22c53f3cd206be1acd2e0344");
    }

    #[test]
    fn dummy_salt_hash_matches_node() {
        let (_, hash) = hash_password("x", Some("00000000000000000000000000000000")).unwrap();
        assert_eq!(hash, "4b6c133f83965e6610960213e65617b44caeb02d5047be01393c3b26b1b931e1");
    }

    #[test]
    fn token_hash_matches_node() {
        assert_eq!(hash_token("abc_DEF-123"), "5cd61b34b7c95370d31492c24a6772572089c480cf5c48fcc1b4484a5a90e0f3");
    }

    #[test]
    fn base64url_matches_node() {
        assert_eq!(URL_SAFE_NO_PAD.encode([251u8, 255, 190, 0, 1]), "-_--AAE");
    }

    #[test]
    fn verify_round_trip() {
        let (salt, hash) = hash_password("s3cret-pass", None).unwrap();
        assert_eq!(salt.len(), 32);
        assert!(verify_password("s3cret-pass", &salt, &hash));
        assert!(!verify_password("wrong", &salt, &hash));
        assert!(!verify_password("s3cret-pass", "not-hex", &hash));
    }

    #[test]
    fn tokens_are_unique_43_char_base64url() {
        let a = generate_token();
        let b = generate_token();
        assert_ne!(a, b);
        assert_eq!(a.len(), 43);
        assert!(a.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_'));
    }
}
