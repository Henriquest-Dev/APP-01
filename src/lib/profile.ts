import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { BannerKey } from './banners';
import { mediaUrl } from './posts';
import type { ProfileCard } from './social';
import { supabase } from './supabase';

export type ImageKind = 'avatar' | 'banner' | 'sticker';

const SPEC = {
  avatar: { aspect: [1, 1] as [number, number], width: 400, format: ImageManipulator.SaveFormat.JPEG, mime: 'image/jpeg', ext: 'jpg' },
  banner: { aspect: [3, 1] as [number, number], width: 1200, format: ImageManipulator.SaveFormat.JPEG, mime: 'image/jpeg', ext: 'jpg' },
  // PNG keeps transparent backgrounds, which stickers usually have.
  sticker: { aspect: [1, 1] as [number, number], width: 512, format: ImageManipulator.SaveFormat.PNG, mime: 'image/png', ext: 'png' },
};

export type ProcessedImage = { uri: string; mime: string; ext: string };

/** Lets the person pick and crop a picture, then shrinks it to a sensible size. */
export async function pickImage(kind: ImageKind): Promise<ProcessedImage | null> {
  const spec = SPEC[kind];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: spec.aspect,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const rendered = await ImageManipulator.ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: spec.width })
    .renderAsync();
  const saved = await rendered.saveAsync({ format: spec.format, compress: 0.85 });
  return { uri: saved.uri, mime: spec.mime, ext: spec.ext };
}

async function upload(path: string, img: ProcessedImage) {
  const bytes = await new File(img.uri).arrayBuffer();
  const { error } = await supabase.storage.from('media').upload(path, bytes, { contentType: img.mime, upsert: false });
  if (error) throw error;
}

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export type ProfileEdit = {
  bio: string;
  location: string;
  website: string;
  bannerColor: BannerKey | null;
};

export type ProfileImages = {
  /** New picture to upload, `null` to remove the current one, `undefined` to keep it. */
  avatar?: ProcessedImage | null;
  banner?: ProcessedImage | null;
};

/** Saves the profile fields and, if changed, the new photo / banner (old files are cleaned up). */
export async function saveProfile(
  userId: string,
  current: ProfileCard,
  edit: ProfileEdit,
  images: ProfileImages,
): Promise<{ avatarUrl: string | null }> {
  const patch: Record<string, string | null> = {
    bio: edit.bio.trim() || null,
    location: edit.location.trim() || null,
    website: edit.website.trim() ? (/^https?:\/\//i.test(edit.website.trim()) ? edit.website.trim() : `https://${edit.website.trim()}`) : null,
    banner_color: edit.bannerColor,
  };
  const old: string[] = [];
  const pathOf = (url: string | null) => (url ? url.split('/media/')[1] ?? null : null);

  if (images.avatar !== undefined) {
    if (images.avatar) {
      const path = `${userId}/avatar-${stamp()}.${images.avatar.ext}`;
      await upload(path, images.avatar);
      patch.avatar_path = path;
    } else patch.avatar_path = null;
    const prev = pathOf(current.avatarUrl);
    if (prev) old.push(prev);
  }
  if (images.banner !== undefined) {
    if (images.banner) {
      const path = `${userId}/banner-${stamp()}.${images.banner.ext}`;
      await upload(path, images.banner);
      patch.banner_path = path;
    } else patch.banner_path = null;
    const prev = pathOf(current.bannerUrl);
    if (prev) old.push(prev);
  }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
  if (old.length) await supabase.storage.from('media').remove(old);
  return { avatarUrl: mediaUrl(patch.avatar_path ?? (images.avatar === undefined ? pathOf(current.avatarUrl) : null)) };
}

// ---- Labels ---------------------------------------------------------------

export type Label = { id: string; label: string; color: BannerKey };

export async function fetchLabels(userId: string): Promise<Label[]> {
  const { data } = await supabase
    .from('profile_labels')
    .select('id, label, color')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return (data ?? []) as Label[];
}

export async function addLabel(label: string, color: BannerKey): Promise<'ok' | 'duplicate' | 'limit' | 'error'> {
  const { error } = await supabase.from('profile_labels').insert({ label: label.trim(), color });
  if (!error) return 'ok';
  if (error.code === '23505') return 'duplicate';
  return /limit/i.test(error.message) ? 'limit' : 'error';
}

export async function removeLabel(id: string) {
  await supabase.from('profile_labels').delete().eq('id', id);
}

// ---- Stickers -------------------------------------------------------------

export type Sticker = { id: string; userId: string; path: string; url: string };

function toSticker(r: any): Sticker {
  return { id: r.id, userId: r.user_id, path: r.path, url: mediaUrl(r.path) ?? '' };
}

export async function fetchStickers(userId: string): Promise<Sticker[]> {
  const { data } = await supabase
    .from('stickers')
    .select('id, user_id, path')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(toSticker);
}

export async function fetchStickersByIds(ids: string[]): Promise<Record<string, Sticker>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return {};
  const { data } = await supabase.from('stickers').select('id, user_id, path').in('id', unique);
  return Object.fromEntries((data ?? []).map((r) => [r.id, toSticker(r)]));
}

export async function createSticker(userId: string, img: ProcessedImage): Promise<'ok' | 'limit' | 'error'> {
  const path = `${userId}/stickers/${stamp()}.${img.ext}`;
  try {
    await upload(path, img);
  } catch {
    return 'error';
  }
  const { error } = await supabase.from('stickers').insert({ path });
  if (!error) return 'ok';
  await supabase.storage.from('media').remove([path]);
  return /limit/i.test(error.message) ? 'limit' : 'error';
}

export async function deleteSticker(s: Sticker) {
  const { error } = await supabase.from('stickers').delete().eq('id', s.id);
  if (error) throw error;
  await supabase.storage.from('media').remove([s.path]);
}

// ---- Followers / following ---------------------------------------------------

export type Person = { id: string; username: string; handle: string; bio: string; pro: boolean };

export async function fetchFollowList(userId: string, kind: 'followers' | 'following'): Promise<Person[]> {
  const pick = kind === 'followers' ? 'follower_id' : 'followee_id';
  const by = kind === 'followers' ? 'followee_id' : 'follower_id';
  const { data } = await supabase
    .from('follows')
    .select(pick)
    .eq(by, userId)
    .order('created_at', { ascending: false })
    .limit(200);
  const ids = (data ?? []).map((r: any) => r[pick] as string);
  if (!ids.length) return [];
  const { data: people } = await supabase
    .from('profile_cards')
    .select('id, username, handle, bio, pro')
    .in('id', ids);
  const byId = new Map((people ?? []).map((p: any) => [p.id, p]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((p: any) => ({ id: p.id, username: p.username, handle: p.handle, bio: p.bio ?? '', pro: !!p.pro }));
}

