// https://github.com/andypotato/fingerpose

const Finger = {

  Thumb:  0,
  Index:  1,
  Middle: 2,
  Ring:   3,
  Pinky:  4,

  // just for convenience
  all: [0, 1, 2, 3, 4],

  nameMapping: {
    0: 'Thumb',
    1: 'Index',
    2: 'Middle',
    3: 'Ring',
    4: 'Pinky'
  },

  // Describes mapping of joints based on the 21 points returned by handpose.
  // Handpose indexes are defined as follows:
  // (all fingers use last index as "finger tip")
  // ---------------------------------------------------------------------------
  // [0]     Palm
  // [1-4]   Thumb
  // [5-8]   Index
  // [9-12]  Middle
  // [13-16] Ring
  // [17-20] Pinky
  pointsMapping: {
    0: [[0, 1], [1, 2], [2, 3], [3, 4]],
    1: [[0, 5], [5, 6], [6, 7], [7, 8]],
    2: [[0, 9], [9, 10], [10, 11], [11, 12]],
    3: [[0, 13], [13, 14], [14, 15], [15, 16]],
    4: [[0, 17], [17, 18], [18, 19], [19, 20]]
  },

  getName: function(value) {
    return (typeof this.nameMapping[value] !== undefined) ?
      this.nameMapping[value] : false;
  },

  getPoints: function(value) {
    return (typeof this.pointsMapping[value] !== undefined) ?
      this.pointsMapping[value] : false;
  },
}

const FingerCurl = {

  NoCurl: 0,
  HalfCurl: 1,
  FullCurl: 2,

  nameMapping: {
    0: 'No Curl',
    1: 'Half Curl',
    2: 'Full Curl'
  },

  getName: function(value) {
    return (typeof this.nameMapping[value] !== undefined) ?
      this.nameMapping[value] : false;
  },

};

const FingerDirection = {

  VerticalUp: 0,
  VerticalDown: 1,
  HorizontalLeft: 2,
  HorizontalRight: 3,
  DiagonalUpRight: 4,
  DiagonalUpLeft: 5,
  DiagonalDownRight: 6,
  DiagonalDownLeft: 7,

  nameMapping: {
    0: 'Vertical Up',
    1: 'Vertical Down',
    2: 'Horizontal Left',
    3: 'Horizontal Right',
    4: 'Diagonal Up Right',
    5: 'Diagonal Up Left',
    6: 'Diagonal Down Right',
    7: 'Diagonal Down Left',
  },

  getName: function(value) {
    return (typeof this.nameMapping[value] !== undefined) ?
      this.nameMapping[value] : false;
  },
};

class FingerPoseEstimator {

  constructor(options) {

    this.options = {...{

      // curl estimation
      HALF_CURL_START_LIMIT: 60.0,
      NO_CURL_START_LIMIT: 130.0,

      // direction estimation
      DISTANCE_VOTE_POWER: 1.1,
      SINGLE_ANGLE_VOTE_POWER: 0.9,
      TOTAL_ANGLE_VOTE_POWER: 1.6
    }, ...options};
  }

  estimate(landmarks) {

    // step 1: calculate slopes

    let slopesXY = [];
    let slopesYZ = [];

    for(let finger of Finger.all) {

      let points = Finger.getPoints(finger);
      let slopeAtXY = [];
      let slopeAtYZ = [];

      for(let point of points) {

        let point1 = landmarks[point[0]];
        let point2 = landmarks[point[1]];

        // calculate single slope
        let slopes = this.getSlopes(point1, point2);
        let slopeXY = slopes[0];
        let slopeYZ = slopes[1];
        slopeAtXY.push(slopeXY);
        slopeAtYZ.push(slopeYZ);
      }

      slopesXY.push(slopeAtXY);
      slopesYZ.push(slopeAtYZ);
    }

    // step 2: calculate orientations

    let fingerCurls = [];
    let fingerDirections = [];

    for(let finger of Finger.all) {

      // start finger predictions from palm - except for thumb
      let pointIndexAt = (finger == Finger.Thumb) ? 1 : 0;

      let fingerPointsAt = Finger.getPoints(finger);
      let startPoint = landmarks[fingerPointsAt[pointIndexAt][0]];
      let midPoint = landmarks[fingerPointsAt[pointIndexAt + 1][1]];
      let endPoint = landmarks[fingerPointsAt[3][1]];

      // check if finger is curled
      let fingerCurled = this.estimateFingerCurl(
        startPoint, midPoint, endPoint
      );

      let fingerPosition = this.calculateFingerDirection(
        startPoint, midPoint, endPoint,
        slopesXY[finger].slice(pointIndexAt)
      );

      fingerCurls[finger] = fingerCurled;
      fingerDirections[finger] = fingerPosition;
    }

    return { curls: fingerCurls, directions: fingerDirections }
  }

  // point1, point2 are 2d or 3d point arrays (xy[z])
  // returns either a single scalar (2d) or array of two slopes (3d)
  getSlopes(point1, point2) {

    let slopeXY = this.calculateSlope(point1[0], point1[1], point2[0], point2[1]);
    if(point1.length == 2) {
      return slopeXY;
    }

    let slopeYZ = this.calculateSlope(point1[1], point1[2], point2[1], point2[2])
    return [slopeXY, slopeYZ];
  }

  angleOrientationAt(angle, weightageAt = 1.0) {

    let isVertical = 0;
    let isDiagonal = 0;
    let isHorizontal = 0;

    if(angle >= 75.0 && angle <= 105.0) {
      isVertical = 1 * weightageAt;
    }
    else if(angle >= 25.0 && angle <= 155.0) {
      isDiagonal = 1 * weightageAt;
    }
    else {
      isHorizontal = 1 * weightageAt;
    }

    return [isVertical, isDiagonal, isHorizontal];
  }

  estimateFingerCurl(startPoint, midPoint, endPoint) {


    let start_mid_x_dist = startPoint.x - midPoint.x;
    let start_end_x_dist = startPoint.x - endPoint.x;
    let mid_end_x_dist = midPoint.x - endPoint.x;
    
    let start_mid_y_dist = startPoint.y - midPoint.y;
    let start_end_y_dist = startPoint.y - endPoint.y;
    let mid_end_y_dist = midPoint.y - endPoint.y;
  
    let start_mid_z_dist = startPoint.z - midPoint.z;
    let start_end_z_dist = startPoint.z - endPoint.z;
    let mid_end_z_dist = midPoint.z - endPoint.z;
    
    let start_mid_dist = Math.sqrt(
      start_mid_x_dist * start_mid_x_dist +
      start_mid_y_dist * start_mid_y_dist +
      start_mid_z_dist * start_mid_z_dist
    );
    let start_end_dist = Math.sqrt(
      start_end_x_dist * start_end_x_dist +
      start_end_y_dist * start_end_y_dist +
      start_end_z_dist * start_end_z_dist
    );
    let mid_end_dist = Math.sqrt(
      mid_end_x_dist * mid_end_x_dist +
      mid_end_y_dist * mid_end_y_dist +
      mid_end_z_dist * mid_end_z_dist
    );


    let cos_in = (
      mid_end_dist * mid_end_dist +
      start_mid_dist * start_mid_dist -
      start_end_dist *start_end_dist
    ) / (2 * mid_end_dist * start_mid_dist);

    if(cos_in > 1.0) {
      cos_in = 1.0;
    }
    else if(cos_in < -1.0) {
      cos_in = -1.0;
    }

    let angleOfCurve = Math.acos(cos_in);
    angleOfCurve = (57.2958 * angleOfCurve) % 180;


    let fingerCurl;
    if(angleOfCurve > this.options.NO_CURL_START_LIMIT) {
      fingerCurl = FingerCurl.NoCurl;
    }
    else if(angleOfCurve > this.options.HALF_CURL_START_LIMIT) {
      fingerCurl = FingerCurl.HalfCurl;
    }
    else {
      fingerCurl = FingerCurl.FullCurl;
    }

    return fingerCurl;
  }

  estimateHorizontalDirection(start_end_x_dist, start_mid_x_dist, mid_end_x_dist, max_dist_x) {

    let estimatedDirection;
    if(max_dist_x == Math.abs(start_end_x_dist)) {
      if(start_end_x_dist > 0) {
        estimatedDirection = FingerDirection.HorizontalLeft;
      } else {
        estimatedDirection = FingerDirection.HorizontalRight;
      }
    }
    else if(max_dist_x == Math.abs(start_mid_x_dist)) {
      if(start_mid_x_dist > 0) {
        estimatedDirection = FingerDirection.HorizontalLeft;
      } else {
        estimatedDirection = FingerDirection.HorizontalRight;
      }
    }
    else {
      if(mid_end_x_dist > 0) {
        estimatedDirection = FingerDirection.HorizontalLeft;
      } else {
        estimatedDirection = FingerDirection.HorizontalRight;
      }
    }

    return estimatedDirection;
  }

  estimateVerticalDirection(start_end_y_dist, start_mid_y_dist, mid_end_y_dist, max_dist_y) {

    let estimatedDirection;
    if(max_dist_y == Math.abs(start_end_y_dist)) {
      if(start_end_y_dist < 0) {
        estimatedDirection = FingerDirection.VerticalDown;
      } else {
        estimatedDirection = FingerDirection.VerticalUp;
      }
    }
    else if(max_dist_y == Math.abs(start_mid_y_dist)) {
      if(start_mid_y_dist < 0) {
        estimatedDirection = FingerDirection.VerticalDown;
      } else {
        estimatedDirection = FingerDirection.VerticalUp;
      }
    }
    else {
      if(mid_end_y_dist < 0) {
        estimatedDirection = FingerDirection.VerticalDown;
      } else {
        estimatedDirection = FingerDirection.VerticalUp;
      }
    }

    return estimatedDirection;
  }

  estimateDiagonalDirection(
    start_end_y_dist, start_mid_y_dist, mid_end_y_dist, max_dist_y,
    start_end_x_dist, start_mid_x_dist, mid_end_x_dist, max_dist_x
  ) {

    let estimatedDirection;
    let reqd_vertical_direction = this.estimateVerticalDirection(
      start_end_y_dist, start_mid_y_dist, mid_end_y_dist, max_dist_y
    );
    let reqd_horizontal_direction = this.estimateHorizontalDirection(
      start_end_x_dist, start_mid_x_dist, mid_end_x_dist, max_dist_x
    );
    
    if(reqd_vertical_direction == FingerDirection.VerticalUp) {
      if(reqd_horizontal_direction == FingerDirection.HorizontalLeft) {
        estimatedDirection = FingerDirection.DiagonalUpLeft;
      } else {
        estimatedDirection = FingerDirection.DiagonalUpRight;
      }
    }
    else {
      if(reqd_horizontal_direction == FingerDirection.HorizontalLeft) {
        estimatedDirection = FingerDirection.DiagonalDownLeft;
      } else {
        estimatedDirection = FingerDirection.DiagonalDownRight;
      }
    }

    return estimatedDirection;
  }

  calculateFingerDirection(startPoint, midPoint, endPoint, fingerSlopes) {

    let start_mid_x_dist = startPoint.x - midPoint.x;
    let start_end_x_dist = startPoint.x - endPoint.x;
    let mid_end_x_dist = midPoint.x - endPoint.x;
    
    let start_mid_y_dist = startPoint.y - midPoint.y;
    let start_end_y_dist = startPoint.y - endPoint.y;
    let mid_end_y_dist = midPoint.y - endPoint.y;

    let max_dist_x = Math.max(
      Math.abs(start_mid_x_dist),
      Math.abs(start_end_x_dist),
      Math.abs(mid_end_x_dist)
    );
    let max_dist_y = Math.max(
      Math.abs(start_mid_y_dist),
      Math.abs(start_end_y_dist),
      Math.abs(mid_end_y_dist)
    );

    let voteVertical = 0.0;
    let voteDiagonal = 0.0;
    let voteHorizontal = 0.0;

    let start_end_x_y_dist_ratio = max_dist_y / (max_dist_x + 0.00001);
    if(start_end_x_y_dist_ratio > 1.5) {
      voteVertical += this.options.DISTANCE_VOTE_POWER;
    }
    else if(start_end_x_y_dist_ratio > 0.66) {
      voteDiagonal += this.options.DISTANCE_VOTE_POWER;
    }
    else {
      voteHorizontal += this.options.DISTANCE_VOTE_POWER;
    }

    let start_mid_dist = Math.sqrt(
      start_mid_x_dist * start_mid_x_dist + start_mid_y_dist *start_mid_y_dist
    );
    let start_end_dist = Math.sqrt(
      start_end_x_dist * start_end_x_dist + start_end_y_dist * start_end_y_dist
    );
    let mid_end_dist = Math.sqrt(
      mid_end_x_dist * mid_end_x_dist + mid_end_y_dist * mid_end_y_dist
    );

    let max_dist = Math.max(start_mid_dist, start_end_dist, mid_end_dist);
    let calc_start_point_x = startPoint.x,
        calc_start_point_y = startPoint.y;
    let calc_end_point_x = endPoint.x,
        calc_end_point_y = endPoint.y;

    if(max_dist == start_mid_dist) {
      calc_end_point_x = endPoint.x,
      calc_end_point_y = endPoint.y;
    }
    else if(max_dist == mid_end_dist) {
      calc_start_point_x = midPoint.x,
      calc_start_point_y = midPoint.y;
    }

    let calcStartPoint = [calc_start_point_x, calc_start_point_y];
    let calcEndPoint = [calc_end_point_x, calc_end_point_y];

    let totalAngle = this.getSlopes(calcStartPoint, calcEndPoint);
    let votes = this.angleOrientationAt(totalAngle, this.options.TOTAL_ANGLE_VOTE_POWER);
    voteVertical += votes[0];
    voteDiagonal += votes[1];
    voteHorizontal += votes[2];

    for(let fingerSlope of fingerSlopes) {
      let votes = this.angleOrientationAt(fingerSlope, this.options.SINGLE_ANGLE_VOTE_POWER);
      voteVertical += votes[0];
      voteDiagonal += votes[1];
      voteHorizontal += votes[2];
    }

    // in case of tie, highest preference goes to Vertical,
    // followed by horizontal and then diagonal
    let estimatedDirection;
    if(voteVertical == Math.max(voteVertical, voteDiagonal, voteHorizontal)) {
      estimatedDirection = this.estimateVerticalDirection(
        start_end_y_dist,
        start_mid_y_dist, 
        mid_end_y_dist, max_dist_y
      );
    }
    else if(voteHorizontal == Math.max(voteDiagonal, voteHorizontal)) {
      estimatedDirection = this.estimateHorizontalDirection(
        start_end_x_dist,
        start_mid_x_dist,
        mid_end_x_dist, max_dist_x
      );
    }
    else {
      estimatedDirection = this.estimateDiagonalDirection(
        start_end_y_dist, start_mid_y_dist,
        mid_end_y_dist, max_dist_y,
        start_end_x_dist, start_mid_x_dist,
        mid_end_x_dist, max_dist_x
      );
    }

    return estimatedDirection;
  }

  calculateSlope(point1x, point1y, point2x, point2y) {

    let value = (point1y - point2y) / (point1x - point2x);
    let slope = Math.atan(value) * 180 / Math.PI;

    if(slope <= 0) {
      slope = -slope;
    }
    else if(slope > 0) {
      slope = 180 - slope;
    }

    return slope;
  }
}

// Gesture

class GestureDescription {
  constructor(name) {

    // name (should be unique)
    this.name = name;

    // gesture as described by curls / directions
    this.curls = {};
    this.directions = {};
  }

  addCurl(finger, curl, contrib=1.0) {
    if(typeof this.curls[finger] === 'undefined') {
      this.curls[finger] = [];
    }
    this.curls[finger].push([curl, contrib]);
  }

  addDirection(finger, position, contrib=1.0) {
    if(typeof this.directions[finger] === 'undefined') {
      this.directions[finger] = [];
    }
    this.directions[finger].push([position, contrib]);
  }

  matchAgainst(detectedCurls, detectedDirections) {

    let score = 0.0;
    let numParameters = 0;

    // look at the detected curl of each finger and compare with
    // the expected curl of this finger inside current gesture
    for(let fingerIdx in detectedCurls) {

      let detectedCurl = detectedCurls[fingerIdx];
      let expectedCurls = this.curls[fingerIdx];

      if(typeof expectedCurls === 'undefined') {
        // no curl description available for this finger
        // => no contribution to the final score
        continue;
      }

      // increase the number of relevant parameters
      numParameters++;

      // compare to each possible curl of this specific finger
      let matchingCurlFound = false;
      let highestCurlContrib = 0;
      for(const [expectedCurl, contrib] of expectedCurls) {
        if(detectedCurl == expectedCurl) {
          score += contrib;
          highestCurlContrib = Math.max(highestCurlContrib, contrib);
          matchingCurlFound = true;
          break;
        }
      }

      // subtract penalty if curl was expected but not found
      if(!matchingCurlFound) {
        score -= highestCurlContrib;
      }
    }

    // same for detected direction of each finger
    for(let fingerIdx in detectedDirections) {

      let detectedDirection = detectedDirections[fingerIdx];
      let expectedDirections = this.directions[fingerIdx];

      if(typeof expectedDirections === 'undefined') {
        // no direction description available for this finger
        // => no contribution to the final score
        continue;
      }

      // increase the number of relevant parameters
      numParameters++;

      // compare to each possible direction of this specific finger
      let matchingDirectionFound = false;
      let highestDirectionContrib = 0;
      for(const [expectedDirection, contrib] of expectedDirections) {
        if(detectedDirection == expectedDirection) {
          score += contrib;
          highestDirectionContrib = Math.max(highestDirectionContrib, contrib);
          matchingDirectionFound = true;
          break;
        }
      }

      // subtract penalty if direction was expected but not found
      if(!matchingDirectionFound) {
        score -= highestDirectionContrib;
      }
    }

    // multiply final score with 10 (to maintain compatibility)
    let finalScore = (score / numParameters) * 10;

    return finalScore;
  }
}

class GestureEstimator {

  constructor(knownGestures, estimatorOptions = {}) {

    this.estimator = new FingerPoseEstimator(estimatorOptions);

    // list of predefined gestures
    this.gestures = knownGestures;
  }

  #getLandMarksFromKeypoints(keypoints3D) {
    return keypoints3D.map(keypoint =>
      [keypoint.x, keypoint.y, keypoint.z]
    );
  }

  estimate(landmarks, minScore) {

    let gesturesFound = [];

    // const landmarks = this.#getLandMarksFromKeypoints(keypoints3D);
    // step 1: get estimations of curl / direction for each finger
    const est = this.estimator.estimate(landmarks);

    let poseData = [];
    for(let fingerIdx of Finger.all) {
      poseData.push([
        Finger.getName(fingerIdx),
        FingerCurl.getName(est.curls[fingerIdx]),
        FingerDirection.getName(est.directions[fingerIdx])
      ]);
    }

    // step 2: compare gesture description to each known gesture
    for(let gesture of this.gestures) {
      let score = gesture.matchAgainst(est.curls, est.directions);
      if(score >= minScore) {
        gesturesFound.push({
          name: gesture.name,
          score: score
        });
      }
    }

    return {
      poseData: poseData,
      gestures: gesturesFound
    };
  }
}

// Customized gesture

// - Colsed Fist ✊
const closedFistGestureDescription = new GestureDescription( 'Closed_Fist' );

for( let finger of [ Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  closedFistGestureDescription.addCurl(finger, FingerCurl.FullCurl, 1.0);
  closedFistGestureDescription.addCurl(finger, FingerCurl.HalfCurl, 0.8);

}


// - Pointing ☝️
const pointingGestureDescription = new GestureDescription( 'Pointing' );

for ( let finger of [ Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  pointingGestureDescription.addCurl( finger, FingerCurl.FullCurl, 1.0 );
  pointingGestureDescription.addCurl( finger, FingerCurl.HalfCurl, 0.7 );

}

pointingGestureDescription.addCurl( Finger.Index, FingerCurl.NoCurl, 1.0 );


// - Pointing with thumb curl ☝️
const pointingThumbGestureDescription = new GestureDescription( 'Pointing' );

for ( let finger of [ Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  pointingThumbGestureDescription.addCurl( finger, FingerCurl.FullCurl, 1.0 );
  pointingThumbGestureDescription.addCurl( finger, FingerCurl.HalfCurl, 0.7 );

}

pointingThumbGestureDescription.addCurl( Finger.Thumb, FingerCurl.HalfCurl, 0.8 );
pointingThumbGestureDescription.addCurl( Finger.Index, FingerCurl.NoCurl, 1.0 );


// - Pinch ☝️
const pinchGestureDescription = new GestureDescription( 'Pinch' );

for ( let finger of [ Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  pinchGestureDescription.addCurl( finger, FingerCurl.FullCurl, 1.0 );
  pinchGestureDescription.addCurl( finger, FingerCurl.HalfCurl, 0.7 );

}


// - Ready to Pinch ☝️
const readyToPinchGestureDescription = new GestureDescription( 'ReadyToPinch' );

for ( let finger of [ Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  readyToPinchGestureDescription.addCurl( finger, FingerCurl.FullCurl, 1.0 );
  readyToPinchGestureDescription.addCurl( finger, FingerCurl.HalfCurl, 0.7 );

}

readyToPinchGestureDescription.addCurl( Finger.Thumb, FingerCurl.NoCurl, 1.0 );
readyToPinchGestureDescription.addCurl( Finger.Thumb, FingerCurl.HalfCurl, 0.8 );
// readyToPinchGestureDescription.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 1.0);
// readyToPinchGestureDescription.addDirection(Finger.Thumb, FingerDirection.HorizontalLeft, 1.0);
// readyToPinchGestureDescription.addDirection(Finger.Thumb, FingerDirection.HorizontalRight, 1.0);
readyToPinchGestureDescription.addCurl( Finger.Index, FingerCurl.NoCurl, 0.7 );
readyToPinchGestureDescription.addCurl( Finger.Index, FingerCurl.HalfCurl, 1.0 );


// - Open Palm ✋
const OpenPalmGestureDescription = new GestureDescription( 'Open_Palm' );

for ( let finger of [ Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky ] ) {

  OpenPalmGestureDescription.addCurl( finger, FingerCurl.NoCurl, 1.0 );

}


// // thumb:
// // - curl: none (must)
// // - direction vertical up (best)
// // - direction diagonal up left / right (acceptable)
// thumbsUpDescription.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
// thumbsUpDescription.addDirection(Finger.Thumb, FingerDirection.VerticalUp, 1.0);
// thumbsUpDescription.addDirection(Finger.Thumb, FingerDirection.DiagonalUpLeft, 0.9);
// thumbsUpDescription.addDirection(Finger.Thumb, FingerDirection.DiagonalUpRight, 0.9);

// // all other fingers:
// // - curled (best)
// // - half curled (acceptable)
// // - pointing down is NOT acceptable
// for(let finger of [Finger.Index, Finger.Middle, Finger.Ring, Finger.Pinky]) {
//   thumbsUpDescription.addCurl(finger, FingerCurl.FullCurl, 1.0);
//   thumbsUpDescription.addCurl(finger, FingerCurl.HalfCurl, 0.9);
// }

// // require the index finger to be somewhat left or right pointing
// // but NOT down and NOT fully up
// thumbsUpDescription.addDirection(Finger.Index, FingerDirection.DiagonalUpLeft, 1.0);
// thumbsUpDescription.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 1.0);
// thumbsUpDescription.addDirection(Finger.Index, FingerDirection.HorizontalRight, 1.0);
// thumbsUpDescription.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 1.0);