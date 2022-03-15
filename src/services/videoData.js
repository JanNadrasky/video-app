export function getVideoData() {
    return fetch('videoDataRes.json')
      .then(data => data.json())
}