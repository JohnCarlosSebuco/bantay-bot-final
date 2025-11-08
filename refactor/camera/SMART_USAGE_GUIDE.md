# ImageBB Smart Usage Guide

## Overview

This implementation optimizes the ESP32-CAM to work within ImageBB's **FREE tier limits** (5000 uploads/month = ~166/day) while providing flexible image access for remote monitoring.

## Daily Upload Budget

- **Total Available**: 166 uploads/day (5000/month)
- **Conservative Limit**: 150 uploads/day (safety margin)
- **Typical Usage**:
  - Bird detection uploads: 50-100/day
  - Manual snapshots: 20-50/day
  - Total: ~70-150/day ✅

## Endpoints

### 1. `/preview` - Local Preview (NO UPLOAD) 🆓

**Best for**: Quick checks, frequent monitoring

```
GET http://<CAMERA_IP>/preview
```

**Returns**: JPEG image directly from camera
**Upload Cost**: ZERO
**Use Case**: When farmer just wants to check the farm quickly
**Limitations**: Only works when app and camera are on same network OR through Main Board proxy

**Recommended Usage**:
- Default view in the app
- Refresh every 5-10 seconds for "live" feel
- No ImageBB quota consumed

### 2. `/capture` - Upload to ImageBB (USES QUOTA) 💾

**Best for**: Important snapshots, remote access needs

```
GET http://<CAMERA_IP>/capture
```

**Returns**: JSON with ImageBB URL
**Upload Cost**: 1 upload (unless cached)
**Smart Caching**: Returns cached URL if last upload was <5 seconds ago
**Use Case**: When farmer needs to save/share image, or access remotely

**Response**:
```json
{
  "status": "ok",
  "imageUrl": "https://i.ibb.co/...",
  "message": "New capture uploaded",
  "uploadsToday": 42
}
```

**Cached Response** (within 5 seconds):
```json
{
  "status": "cached",
  "imageUrl": "https://i.ibb.co/...",
  "message": "Recent image (3s ago)",
  "uploadsToday": 42
}
```

**Rate Limit Response**:
```json
{
  "status": "error",
  "message": "Daily upload limit reached (150/150)",
  "imageUrl": "https://i.ibb.co/..."
}
```

### 3. `/stats` - Upload Statistics 📊

**Best for**: Monitoring quota usage

```
GET http://<CAMERA_IP>/stats
```

**Returns**:
```json
{
  "uploadsToday": 42,
  "detectionUploads": 35,
  "manualUploads": 7,
  "dailyLimit": 150,
  "remainingUploads": 108,
  "uploadCooldown": 5,
  "lastImageUrl": "https://i.ibb.co/...",
  "birdsDetectedToday": 12,
  "secondsSinceLastUpload": 127
}
```

### 4. `/settings` - Camera Settings ⚙️

**POST** configuration changes

```json
{
  "brightness": 0,
  "contrast": 0
}
```

## Smart Usage Strategy

### Strategy 1: Local Preview + On-Demand Upload (RECOMMENDED)

**App Behavior**:
1. Show `/preview` by default (refresh every 5-10s)
2. Add "Save to Cloud" button that calls `/capture`
3. Bird detection auto-uploads to ImageBB
4. Manual "Save" only when farmer wants to keep the image

**Benefits**:
- Feels like live streaming
- Zero quota for casual viewing
- ImageBB only used for important images
- Typical usage: ~70 uploads/day

### Strategy 2: Hybrid Mode

**App Behavior**:
1. When on same network: Use `/preview`
2. When remote: Use `/capture` with aggressive caching
3. Show upload quota in UI

**Benefits**:
- Efficient when local
- Works remotely
- Farmer aware of quota

### Strategy 3: Upload-Only (Fallback)

**App Behavior**:
1. Only use `/capture` endpoint
2. Rely on smart caching (5s cooldown)
3. Show quota warnings

**Benefits**:
- Simple implementation
- Works everywhere
- Caching prevents waste

## Upload Quota Management

### Automatic Features

1. **Daily Reset**: Counter resets every 24 hours
2. **Smart Caching**: Same URL returned if <5s since last upload
3. **Rate Limiting**: Blocks uploads after 150/day limit
4. **Statistics Tracking**: Separate counters for detection vs manual

### Bird Detection Behavior

**Normal Operation**:
- Detection triggers → Upload to ImageBB → Notify Main Board
- 10-second cooldown between detections

**When Quota Exhausted**:
- Detection still triggers → NO upload → Notify Main Board (no image)
- System continues to function, just without images

### Manual Capture Behavior

**Normal Operation**:
- Request → Check cache → Upload if needed → Return URL

**Smart Caching**:
- Request within 5s → Return cached URL immediately
- No new upload, saves quota

**When Quota Exhausted**:
- Returns HTTP 429 (Too Many Requests)
- Returns last available cached URL
- Farmer sees warning message

## App Integration Recommendations

### Dashboard View

```javascript
// Default: Show local preview
const [previewUrl, setPreviewUrl] = useState('');
const [uploadedUrl, setUploadedUrl] = useState('');
const [stats, setStats] = useState({});

// Refresh preview every 5 seconds (no quota)
useEffect(() => {
  const interval = setInterval(() => {
    setPreviewUrl(`http://${CAMERA_IP}/preview?t=${Date.now()}`);
  }, 5000);
  return () => clearInterval(interval);
}, []);

// Load stats every minute
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://${CAMERA_IP}/stats`);
    setStats(await response.json());
  }, 60000);
  return () => clearInterval(interval);
}, []);

// Manual save to cloud
const saveToCloud = async () => {
  const response = await fetch(`http://${CAMERA_IP}/capture`);
  const data = await response.json();

  if (data.status === 'ok' || data.status === 'cached') {
    setUploadedUrl(data.imageUrl);
    Alert.alert('Saved!', `Image saved to cloud. ${data.uploadsToday}/150 uploads used today.`);
  } else if (response.status === 429) {
    Alert.alert('Quota Exceeded', 'Daily upload limit reached. Try again tomorrow.');
  }
};
```

### UI Elements

**Upload Quota Indicator**:
```
📊 Uploads Today: 42/150 (108 remaining)
```

**Preview/Snapshot Toggle**:
```
[Preview (Live)] [Snapshot (Cloud)]
```

**Save Button** (when using preview):
```
[💾 Save to Cloud]
```

## Monitoring & Debugging

### Serial Monitor Output

```
📊 Upload stats - Today: 42/150 | Detection: 35 | Manual: 7
```

### Checking Current Status

```bash
curl http://<CAMERA_IP>/stats | jq
```

### Testing Upload Behavior

```bash
# First request (should upload)
curl http://<CAMERA_IP>/capture

# Immediate second request (should be cached)
curl http://<CAMERA_IP>/capture

# Wait 6 seconds, then request (new upload)
sleep 6 && curl http://<CAMERA_IP>/capture
```

## Troubleshooting

### "Daily upload limit reached"

**Cause**: Exceeded 150 uploads in 24 hours

**Solutions**:
1. Wait for daily reset (automatic every 24h)
2. Use `/preview` instead of `/capture`
3. Reduce bird detection sensitivity
4. Increase detection cooldown

### Images not uploading

**Check**:
1. `/stats` endpoint - is quota exceeded?
2. Main Board is running (proxy needed for ImageBB)
3. Network connectivity
4. Serial monitor for error messages

### Cached images too old

**Solution**:
- Reduce `UPLOAD_COOLDOWN` in code (currently 5s)
- Trade-off: Lower cooldown = more uploads = faster quota usage

## Best Practices

1. **Use `/preview` as default** - Save quota for important moments
2. **Monitor quota** - Show stats in app UI
3. **Educate users** - Explain difference between preview and save
4. **Set expectations** - "Live view" vs "Cloud storage"
5. **Plan for quota** - ~150 uploads = ~1 per 10 minutes if used continuously

## Cost Analysis

**ImageBB Free Tier**: 5000 uploads/month = 0 PHP

**Alternatives if outgrown**:
- VPS ($3-5/month = 150-250 PHP/month)
- ImageBB Paid (check pricing)
- Firebase Storage (requires credit card)

**Recommendation**: Start with free tier, monitor usage, upgrade only if needed
