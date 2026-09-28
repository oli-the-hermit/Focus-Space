//! Backend parity, desktop half: runs shared/api-scenarios.json through
//! `dispatch()`, the same script scripts/parity/run-web.ts runs over HTTP
//! against Express. The scenario language is documented in that JSON file;
//! keep `resolve` / `get_path` / `compare` in sync with run-web.ts.

use std::collections::HashMap;

use serde_json::{json, Map, Value};

use super::handlers::dispatch;
use super::Backend;

const SCENARIOS: &str = include_str!("../../../shared/api-scenarios.json");
const LIMITS_JSON: &str = include_str!("../../../shared/limits.json");

type Vars = HashMap<String, Value>;

/// Looks up a dot path; negative array indexes count from the end, `length` works on arrays and strings.
fn get_path(value: &Value, dotted: &str) -> Option<Value> {
    if dotted.is_empty() {
        return Some(value.clone());
    }
    let mut cur = value;
    let segs: Vec<&str> = dotted.split('.').collect();
    for (n, seg) in segs.iter().enumerate() {
        let last = n == segs.len() - 1;
        match cur {
            Value::Array(items) if *seg == "length" && last => return Some(json!(items.len())),
            Value::String(s) if *seg == "length" && last => return Some(json!(s.encode_utf16().count())),
            Value::Array(items) => {
                let i: i64 = seg.parse().ok()?;
                let idx = if i < 0 { items.len() as i64 + i } else { i };
                cur = items.get(usize::try_from(idx).ok()?)?;
            }
            Value::Object(map) => cur = map.get(*seg)?,
            _ => return None,
        }
    }
    Some(cur.clone())
}

fn lookup_var(vars: &Vars, name: &str) -> Value {
    vars.get(name).cloned().unwrap_or_else(|| panic!("variable {{{{{name}}}}} is not set"))
}

fn var_as_text(v: Value) -> String {
    match v {
        Value::String(s) => s,
        other => other.to_string(),
    }
}

fn interpolate(s: &str, vars: &Vars) -> String {
    let mut out = String::new();
    let mut rest = s;
    while let Some(start) = rest.find("{{") {
        let end = rest[start..].find("}}").map(|e| start + e).expect("unclosed {{");
        out.push_str(&rest[..start]);
        out.push_str(&var_as_text(lookup_var(vars, &rest[start + 2..end])));
        rest = &rest[end + 2..];
    }
    out.push_str(rest);
    out
}

fn as_i64(v: &Value) -> i64 {
    v.as_i64().unwrap_or_else(|| panic!("expected a number, got {v}"))
}

fn resolve(value: &Value, vars: &Vars, limits: &Value) -> Value {
    match value {
        Value::String(s) => {
            if let Some(p) = s.strip_prefix("$limits.") {
                return get_path(limits, p).unwrap_or_else(|| panic!("unknown limit {s}"));
            }
            if let Some(name) = s.strip_prefix("{{").and_then(|r| r.strip_suffix("}}")) {
                if name.chars().all(|c| c.is_alphanumeric() || c == '_') {
                    return lookup_var(vars, name);
                }
            }
            Value::String(interpolate(s, vars))
        }
        Value::Array(items) => Value::Array(items.iter().map(|v| resolve(v, vars, limits)).collect()),
        Value::Object(map) => {
            if let Some(s) = map.get("$repeat") {
                let times = as_i64(&resolve(&map["times"], vars, limits));
                return Value::String(s.as_str().expect("$repeat takes a string").repeat(times as usize));
            }
            if let Some(Value::Array(terms)) = map.get("$add") {
                return json!(terms.iter().map(|t| as_i64(&resolve(t, vars, limits))).sum::<i64>());
            }
            Value::Object(map.iter().map(|(k, v)| (k.clone(), resolve(v, vars, limits))).collect::<Map<_, _>>())
        }
        other => other.clone(),
    }
}

/// Every way the response differs from the expectation (empty when it matches).
fn compare(expect: &Value, status: u16, body: &Value, vars: &Vars, limits: &Value) -> Vec<String> {
    let mut errs = Vec::new();
    let want_status = expect["status"].as_u64().expect("expect.status") as u16;
    if status != want_status {
        errs.push(format!("status {status}, expected {want_status}"));
    }
    if want_status == 204 && !body.is_null() {
        errs.push(format!("204 with a body: {body}"));
    }
    if let Some(code) = expect.get("code") {
        let got = get_path(body, "code");
        if got.as_ref() != Some(code) {
            errs.push(format!("code {got:?}, expected {code}"));
        }
        let want = expect.get("params").map(|p| resolve(p, vars, limits));
        let got = get_path(body, "params");
        if got != want {
            errs.push(format!("params {got:?}, expected {want:?}"));
        }
    }
    if let Some(Value::Object(paths)) = expect.get("body") {
        for (p, v) in paths {
            let want = resolve(v, vars, limits);
            let got = get_path(body, p);
            if got.as_ref() != Some(&want) {
                errs.push(format!("{p} = {got:?}, expected {want}"));
            }
        }
    }
    if let Some(Value::Object(paths)) = expect.get("keys") {
        for (p, keys) in paths {
            let mut want: Vec<String> = keys.as_array().expect("keys list").iter().map(|k| k.as_str().unwrap().to_string()).collect();
            want.sort();
            let got = match get_path(body, p) {
                Some(Value::Object(m)) => {
                    let mut k: Vec<String> = m.keys().cloned().collect();
                    k.sort();
                    Some(k)
                }
                _ => None,
            };
            if got.as_ref() != Some(&want) {
                errs.push(format!("keys at {p:?}: {got:?}, expected {want:?}"));
            }
        }
    }
    errs
}

#[test]
fn api_scenarios_match_the_web_server() {
    let doc: Value = serde_json::from_str(SCENARIOS).expect("shared/api-scenarios.json is valid");
    let limits: Value = serde_json::from_str(LIMITS_JSON).expect("shared/limits.json is valid");
    let steps = doc["scenarios"].as_array().expect("scenarios list");

    let b = Backend::in_memory();
    let mut vars = Vars::new();
    let mut failures = Vec::new();
    let mut ran = 0;

    for step in steps {
        let name = step["name"].as_str().expect("name");
        if step.get("only").is_some_and(|o| o != "desktop") {
            continue;
        }
        let times = step.get("repeat").map_or(1, |r| as_i64(&resolve(r, &vars, &limits)));
        for i in 0..times {
            vars.insert("i".into(), json!(i));
            let method = step["method"].as_str().expect("method");
            let path = var_as_text(resolve(&step["path"], &vars, &limits));
            let body = step.get("body").map(|v| resolve(v, &vars, &limits));
            let token = step.get("auth").map(|a| var_as_text(resolve(a, &vars, &limits)));

            let res = dispatch(&b, method, &path, body, token);
            ran += 1;
            let label = if times > 1 { format!("{name} [{i}]") } else { name.to_string() };
            let errs = compare(&step["expect"], res.status, &res.body, &vars, &limits);
            if !errs.is_empty() {
                failures.push(format!("{label}: {}", errs.join("; ")));
            }
            if let Some(Value::Object(save)) = step.get("save") {
                for (var, p) in save {
                    match get_path(&res.body, p.as_str().expect("save path")) {
                        Some(v) => {
                            vars.insert(var.clone(), v);
                        }
                        None => failures.push(format!("{label}: nothing at {p} to save as {{{{{var}}}}}")),
                    }
                }
            }
        }
    }

    assert!(ran > 0, "no scenarios ran");
    assert!(failures.is_empty(), "{} parity failure(s) in {ran} requests:\n  {}", failures.len(), failures.join("\n  "));
}
