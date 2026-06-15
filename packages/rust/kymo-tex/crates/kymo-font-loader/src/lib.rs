use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, OnceLock, RwLock};

use kymo_font::FontId;
use kymo_types::display_item::DisplayItem;

pub mod outline_cache;

pub type FontBytes = Arc<Vec<u8>>;
type CachedFont = Option<FontBytes>;

const FONT_MAP: &[(FontId, &str)] = &[
    (FontId::MainRegular, "KaTeX_Main-Regular.ttf"),
    (FontId::MainBold, "KaTeX_Main-Bold.ttf"),
    (FontId::MainItalic, "KaTeX_Main-Italic.ttf"),
    (FontId::MainBoldItalic, "KaTeX_Main-BoldItalic.ttf"),
    (FontId::MathItalic, "KaTeX_Math-Italic.ttf"),
    (FontId::MathBoldItalic, "KaTeX_Math-BoldItalic.ttf"),
    (FontId::AmsRegular, "KaTeX_AMS-Regular.ttf"),
    (FontId::CaligraphicRegular, "KaTeX_Caligraphic-Regular.ttf"),
    (FontId::FrakturRegular, "KaTeX_Fraktur-Regular.ttf"),
    (FontId::FrakturBold, "KaTeX_Fraktur-Bold.ttf"),
    (FontId::SansSerifRegular, "KaTeX_SansSerif-Regular.ttf"),
    (FontId::SansSerifBold, "KaTeX_SansSerif-Bold.ttf"),
    (FontId::SansSerifItalic, "KaTeX_SansSerif-Italic.ttf"),
    (FontId::ScriptRegular, "KaTeX_Script-Regular.ttf"),
    (FontId::TypewriterRegular, "KaTeX_Typewriter-Regular.ttf"),
    (FontId::Size1Regular, "KaTeX_Size1-Regular.ttf"),
    (FontId::Size2Regular, "KaTeX_Size2-Regular.ttf"),
    (FontId::Size3Regular, "KaTeX_Size3-Regular.ttf"),
    (FontId::Size4Regular, "KaTeX_Size4-Regular.ttf"),
];

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
enum FontSourceKey {
    Embedded,
    Directory(PathBuf),
    SystemUnicode,
    SystemFallback,
    SystemEmoji,
}

#[derive(Debug, Clone, PartialEq, Eq, Hash)]
struct CacheKey {
    source: FontSourceKey,
    font_id: FontId,
}

#[derive(Debug, Clone)]
pub struct FontSet {
    fonts: HashMap<FontId, FontBytes>,
}

impl FontSet {
    pub fn get(&self, id: &FontId) -> Option<&[u8]> {
        self.fonts.get(id).map(|bytes| bytes.as_slice())
    }

    pub fn contains_key(&self, id: &FontId) -> bool {
        self.fonts.contains_key(id)
    }

    pub fn iter(&self) -> impl Iterator<Item = (&FontId, &[u8])> {
        self.fonts.iter().map(|(id, bytes)| (id, bytes.as_slice()))
    }
}

impl From<HashMap<FontId, Vec<u8>>> for FontSet {
    fn from(fonts: HashMap<FontId, Vec<u8>>) -> Self {
        Self {
            fonts: fonts
                .into_iter()
                .map(|(id, bytes)| (id, Arc::new(bytes)))
                .collect(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct FontLoadPlan {
    required: HashSet<FontId>,
    optional: HashSet<FontId>,
}

impl FontLoadPlan {
    pub fn for_display_items(items: &[DisplayItem]) -> Self {
        let mut required = HashSet::new();
        let mut optional = HashSet::new();
        let mut needs_optional_unicode_fallbacks = false;

        for item in items {
            if let DisplayItem::GlyphPath {
                font, char_code, ..
            } = item
            {
                if let Some(font_id) = FontId::parse(font) {
                    match font_id {
                        FontId::CjkRegular | FontId::CjkFallback | FontId::EmojiFallback => {
                            required.insert(font_id);
                            needs_optional_unicode_fallbacks = true;
                        }
                        _ => {
                            required.insert(font_id);
                        }
                    }
                    if may_need_runtime_unicode_fallback(font_id, *char_code) {
                        needs_optional_unicode_fallbacks = true;
                    }
                }
            }
        }

        required.insert(FontId::MainRegular);

        if needs_optional_unicode_fallbacks {
            optional.insert(FontId::CjkRegular);
            optional.insert(FontId::EmojiFallback);
            optional.insert(FontId::CjkFallback);
        }

        Self { required, optional }
    }

    pub fn required(&self) -> &HashSet<FontId> {
        &self.required
    }

    pub fn all(&self) -> HashSet<FontId> {
        self.required.union(&self.optional).copied().collect()
    }
}

fn may_need_runtime_unicode_fallback(font_id: FontId, char_code: u32) -> bool {
    matches!(
        font_id,
        FontId::CjkRegular | FontId::CjkFallback | FontId::EmojiFallback
    ) || (char_code > 0x7f && kymo_font::get_char_metrics(font_id, char_code).is_none())
}

static FONT_CACHE: OnceLock<RwLock<HashMap<CacheKey, CachedFont>>> = OnceLock::new();

fn cache() -> &'static RwLock<HashMap<CacheKey, CachedFont>> {
    FONT_CACHE.get_or_init(|| RwLock::new(HashMap::new()))
}

pub fn load_fonts_for_items(font_dir: &str, items: &[DisplayItem]) -> Result<FontSet, String> {
    let plan = FontLoadPlan::for_display_items(items);
    load_fonts_for_plan(font_dir, &plan)
}

pub fn load_fonts_for_plan(font_dir: &str, plan: &FontLoadPlan) -> Result<FontSet, String> {
    let wanted = plan.all();
    let mut out = HashMap::new();
    let cache = cache();

    {
        let cached = cache
            .read()
            .map_err(|_| "font cache poisoned".to_string())?;
        if collect_cached(font_dir, &wanted, &cached, &mut out) {
            validate_required(plan, &out)?;
            return Ok(FontSet { fonts: out });
        }
    }

    {
        let mut cached = cache
            .write()
            .map_err(|_| "font cache poisoned".to_string())?;
        for &font_id in &wanted {
            let key = cache_key(font_dir, font_id);
            if cached.contains_key(&key) {
                continue;
            }
            let loaded = load_font_bytes(font_dir, font_id)?;
            cached.insert(key, loaded);
        }
        // Re-collect without clearing `out`: fonts already inserted during the
        // read-lock fast path stay in place (overwritten with identical Arc
        // clones), and newly loaded fonts are added.
        collect_cached(font_dir, &wanted, &cached, &mut out);
    }

    validate_required(plan, &out)?;
    Ok(FontSet { fonts: out })
}

fn collect_cached(
    font_dir: &str,
    wanted: &HashSet<FontId>,
    cached: &HashMap<CacheKey, CachedFont>,
    out: &mut HashMap<FontId, FontBytes>,
) -> bool {
    let mut all_known = true;
    for &font_id in wanted {
        let key = cache_key(font_dir, font_id);
        match cached.get(&key) {
            Some(Some(bytes)) => {
                out.insert(font_id, Arc::clone(bytes));
            }
            Some(None) => {}
            None => {
                all_known = false;
            }
        }
    }
    all_known
}

fn validate_required(
    plan: &FontLoadPlan,
    loaded: &HashMap<FontId, FontBytes>,
) -> Result<(), String> {
    for &font_id in plan.required() {
        if !loaded.contains_key(&font_id) {
            return Err(format!("Missing required font {}", font_id.as_str()));
        }
    }
    Ok(())
}

fn cache_key(font_dir: &str, font_id: FontId) -> CacheKey {
    CacheKey {
        source: source_key(font_dir, font_id),
        font_id,
    }
}

fn source_key(font_dir: &str, font_id: FontId) -> FontSourceKey {
    match font_id {
        FontId::CjkRegular => FontSourceKey::SystemUnicode,
        FontId::CjkFallback => FontSourceKey::SystemFallback,
        FontId::EmojiFallback => FontSourceKey::SystemEmoji,
        _ => katex_source_key(font_dir),
    }
}

#[cfg(feature = "embed-fonts")]
fn katex_source_key(_font_dir: &str) -> FontSourceKey {
    FontSourceKey::Embedded
}

#[cfg(not(feature = "embed-fonts"))]
fn katex_source_key(font_dir: &str) -> FontSourceKey {
    FontSourceKey::Directory(normalize_font_dir(font_dir))
}

#[cfg(not(feature = "embed-fonts"))]
fn normalize_font_dir(font_dir: &str) -> PathBuf {
    let path = std::path::Path::new(font_dir);
    path.canonicalize().unwrap_or_else(|_| path.to_path_buf())
}

fn load_font_bytes(font_dir: &str, font_id: FontId) -> Result<Option<FontBytes>, String> {
    match font_id {
        FontId::CjkRegular => Ok(kymo_unicode_font::load_unicode_font_arc()),
        FontId::CjkFallback => Ok(kymo_unicode_font::load_fallback_font_arc()),
        FontId::EmojiFallback => Ok(kymo_unicode_font::load_emoji_font_arc()),
        _ => load_katex_font(font_dir, font_id),
    }
}

#[cfg(not(feature = "embed-fonts"))]
fn load_katex_font(font_dir: &str, font_id: FontId) -> Result<Option<FontBytes>, String> {
    let Some(filename) = FONT_MAP
        .iter()
        .find(|(id, _)| *id == font_id)
        .map(|(_, f)| *f)
    else {
        return Ok(None);
    };
    let path = std::path::Path::new(font_dir).join(filename);
    if !path.exists() {
        return Ok(None);
    }
    std::fs::read(&path)
        .map(|bytes| Some(Arc::new(bytes)))
        .map_err(|e| format!("Failed to read {}: {e}", path.display()))
}

#[cfg(feature = "embed-fonts")]
fn load_katex_font(_font_dir: &str, font_id: FontId) -> Result<Option<FontBytes>, String> {
    let Some(filename) = FONT_MAP
        .iter()
        .find(|(id, _)| *id == font_id)
        .map(|(_, f)| *f)
    else {
        return Ok(None);
    };
    Ok(kymo_katex_fonts::ttf_bytes(filename).map(|cow| Arc::new(cow.into_owned())))
}

#[cfg(test)]
mod tests {
    use super::*;
    use kymo_types::color::Color;

    fn glyph(font: FontId, char_code: u32) -> DisplayItem {
        DisplayItem::GlyphPath {
            x: 0.0,
            y: 0.0,
            scale: 1.0,
            font: font.as_str().to_string(),
            char_code,
            color: Color::BLACK,
        }
    }

    #[test]
    fn ascii_katex_glyph_does_not_request_unicode_fallbacks() {
        let plan = FontLoadPlan::for_display_items(&[glyph(FontId::MainRegular, 'x' as u32)]);

        assert!(plan.required.contains(&FontId::MainRegular));
        assert!(!plan.optional.contains(&FontId::CjkRegular));
        assert!(!plan.optional.contains(&FontId::EmojiFallback));
        assert!(!plan.optional.contains(&FontId::CjkFallback));
    }

    #[test]
    fn non_ascii_without_katex_metrics_requests_optional_unicode_fallbacks() {
        let plan = FontLoadPlan::for_display_items(&[glyph(FontId::MainRegular, '⌘' as u32)]);

        assert!(plan.required.contains(&FontId::MainRegular));
        assert!(plan.optional.contains(&FontId::CjkRegular));
        assert!(plan.optional.contains(&FontId::EmojiFallback));
        assert!(plan.optional.contains(&FontId::CjkFallback));
        assert!(!plan.required.contains(&FontId::CjkRegular));
    }

    #[test]
    fn explicit_cjk_glyph_requires_primary_cjk_font() {
        let plan = FontLoadPlan::for_display_items(&[glyph(FontId::CjkRegular, '你' as u32)]);

        assert!(plan.required.contains(&FontId::CjkRegular));
        assert!(plan.optional.contains(&FontId::EmojiFallback));
        assert!(plan.optional.contains(&FontId::CjkFallback));
    }

    #[test]
    fn cached_missing_optional_font_counts_as_known() {
        let font_dir = "/tmp/kymo-font-loader-test-missing-optional";
        let mut wanted = HashSet::new();
        wanted.insert(FontId::EmojiFallback);

        let mut cached = HashMap::new();
        cached.insert(cache_key(font_dir, FontId::EmojiFallback), None);

        let mut out = HashMap::new();
        assert!(collect_cached(font_dir, &wanted, &cached, &mut out));
        assert!(!out.contains_key(&FontId::EmojiFallback));
    }
}
