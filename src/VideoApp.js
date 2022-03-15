import React, { useRef, useState, useEffect } from "react";
import { getVideoData } from './services/videoData';
import "./VideoApp.scss";

let loaded = false;
let breakpointsPositions = [];
let breakpointsPositionsDisplay = [];
let progress = 0;
let videoData = [];
let actualLoopIndex = 0;

function VideoApp() {
  const sliderRef = useRef(null);
  const videoRef = useRef(null);
  const progressBarContainer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoTime, setVideoTime] = useState(0);
  const [isSliderDown, setSliderDown] = useState(false);
  const [videoPath, setVideoPath] = useState(null);
  const [videoDataRes, setVideoDataRes] = useState(null);

  // fetching data

  useEffect(() => {
    let mounted = true;
    getVideoData()
      .then(videoData => {
        if(mounted) {
          setVideoDataRes(videoData.videoData);
          setVideoPath(videoData.videoData.path);
        }
      })
    return () => mounted = false;
  }, []);

  // slider handling

  const activateSlider = () => {
    setSliderDown(true);
  }

  const moveSlider = React.useCallback((e) => {
    const timeBarRectLeft = progressBarContainer.current.offsetLeft;
    const cursorPosInBar = (e.clientX - timeBarRectLeft);
    const totalWidth = progressBarContainer.current.offsetWidth;
    const percentage = ( cursorPosInBar / totalWidth );
    if (percentage * 100 > 100) { percentage = 0.1 };
    if (percentage * 100 < 0) { percentage = 0 };
    let vidTime = videoRef.current.duration * percentage;
    videoRef.current.currentTime = vidTime;
    progress = percentage * 100;
  }, []);

  useEffect(() => {
    if (isSliderDown) {
      window.addEventListener("mousemove", moveSlider);
      window.addEventListener("mouseup", sliderUp);
    } else {
      window.removeEventListener("mousemove", moveSlider);
      window.addEventListener("mouseup", sliderUp);
    }
    
}, [isSliderDown, setSliderDown]);
  
  const sliderUp = () => {
    setSliderDown(false);
  }

  // parsing incoming data

  const parseDataAndSetTheInOutBreakpoints = () => {
    if (progressBarContainer.current && videoRef.current?.duration && sliderRef.current && !loaded) {
      videoDataRes.startEnd.forEach(startEndItem => {  
        videoData.push({startEndPosition: [progressBarContainer.current.offsetWidth * startEndItem.start, 
          progressBarContainer.current.offsetWidth * startEndItem.end], 
          startTime: startEndItem.start * videoRef.current.duration,
          endTime: startEndItem.end * videoRef.current.duration });
          const start = progressBarContainer.current.offsetWidth * startEndItem.start;
          const end = progressBarContainer.current.offsetWidth * startEndItem.end;
        breakpointsPositions.push(start);
        breakpointsPositions.push(end);
        breakpointsPositionsDisplay.push({ start: start, width: end - start });       
      });
      videoRef.current.currentTime = videoDataRes.startEnd[0].start;
      loaded = true;
    }
    progress = (videoRef.current?.currentTime / videoRef.current?.duration) * 100;
  }

  // handling controls and events

  const videoHandler = (control) => {
    if (control === "play") {
      videoRef.current.play();
      setPlaying(true);
      setVideoTime(videoRef.current.duration);
    } else if (control === "pause") {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const closestInOutPoint = (e) => {
    const targetRect = e.target.getBoundingClientRect();
    const cursorPosition = e.clientX - targetRect.left;
    const closestInOutPoint = breakpointsPositions.reduce((a, b) => {
      return Math.abs(b - cursorPosition) < Math.abs(a - cursorPosition) ? b : a;
    });
    videoData.forEach((dataItem, index) => {
      dataItem.startEndPosition.forEach((position) => {
        if (position === closestInOutPoint) {
          actualLoopIndex = index;
        }
      });
    });
    videoRef.current.play();
    setPlaying(true);
    setVideoTime(videoRef.current.duration);
  }

  const nextInOutPoint = () => {
    actualLoopIndex = (actualLoopIndex === videoData.length - 1) ? 0 : actualLoopIndex + 1;
    videoRef.current.play();
    setPlaying(true);
    setVideoTime(videoRef.current.duration);
  };

  const previousInOutPoint = () => {
    actualLoopIndex = (actualLoopIndex === 0) ? videoData.length - 1 : actualLoopIndex - 1;
    videoRef.current.play();
    setPlaying(true);
    setVideoTime(videoRef.current.duration);
  };

  // handling timeline

  window.setInterval(function () {
    if(isSliderDown) { return; };
    if (videoRef.current && videoData.length) {
      setCurrentTime(videoRef.current?.currentTime);
      progress = (videoRef.current?.currentTime / videoTime) * 100;
      if (Math.floor(videoRef.current?.currentTime) === Math.floor(videoData[actualLoopIndex].endTime)) {
        videoRef.current.currentTime = videoData[actualLoopIndex]?.startTime;
        progress = (videoRef.current?.currentTime / videoTime) * 100;
      }
    }
  }, 1000);

  // html

    return (
      <div className="app">
        <video
          id="video"
          ref={videoRef}
          className="video"
          autoPlay
          onLoadedData={() => parseDataAndSetTheInOutBreakpoints()}
          src={`${videoPath}#t=${videoData[actualLoopIndex]?.startTime},${videoData[actualLoopIndex]?.endTime}`}
        ></video>

        <div className="controlsContainer">
          <div className="controlsContainer__controls">
            <img
              onClick={previousInOutPoint}
              className="controlsContainer__controls--controlsIcon"
              alt=""
              src="/left-arrow-icon.png"
            />
            {playing ? (
              <img
                onClick={() => videoHandler("pause")}
                className="controlsContainer__controls--controlsIcon--small"
                alt=""
                src="/pause.webp"
              />
            ) : (
              <img
                onClick={() => videoHandler("play")}
                className="controlsContainer__controls--controlsIcon--small"
                alt=""
                src="/play.jpg"
              />
            )}
            <img
              className="controlsContainer__controls--controlsIcon icon-revert"
              onClick={nextInOutPoint}
              alt=""
              src="/left-arrow-icon.png"
            />
          </div>
        </div>

        <div className="timecontrols">
          <div id="progressBarContainer" ref={progressBarContainer} className="timecontrols__progressbarContainer" onClick={closestInOutPoint}>
            <div className="timecontrols__progressbarContainer__inOutPointsContainer">
              {breakpointsPositionsDisplay && breakpointsPositionsDisplay.map((position, index) => (
                  <span key={index} id={index} className="timecontrols__progressbarContainer__inOutPointsContainer--controls" style={{left: position.start - 10, width: position.width}}>
                  </span>
                ))}
            </div>
              <div
                style={{ width: `${progress}%` }}
                className="timecontrols__progressBar"
              >
              </div>
              <span onMouseDown={activateSlider} id="slider" ref={sliderRef} className="timecontrols__progressbarContainer--slider" style={{left: `calc(${progress}% - 10px)`}}></span>
          </div>
        </div>
      </div>
    );
  }

export default VideoApp;