import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, MapPin, RefreshCw } from "lucide-react";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

const AttendanceValidation = ({ onValidationSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState("");
  const [timeValid, setTimeValid] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  // Exception modal states
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [exceptionForm, setExceptionForm] = useState({
    reason: "",
    details: "",
    studentId: "",
    studentName: "",
    currentLocation: null,
  });

  // NEW: One-time location check states
  const [oneTimeLocationSaved, setOneTimeLocationSaved] = useState(false);
  const [isOneTimeLocationLoading, setIsOneTimeLocationLoading] =
    useState(false);

  // Load settings from Firestore
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await getDoc(
          doc(db, "attendance_settings", "current_settings")
        );
        if (settingsDoc.exists()) {
          const settingsData = settingsDoc.data();
          setSettings(settingsData);
          checkTimeValidity(settingsData.timeWindow);
        } else {
          console.error("No attendance settings found");
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setSettingsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const checkTimeValidity = (timeWindow) => {
    if (!timeWindow) return;
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const isValidTime =
      currentTime >= timeWindow.start && currentTime <= timeWindow.end;
    setTimeValid(isValidTime);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const requestLocation = async () => {
    setIsLoading(true);
    setLocationError("");

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }
      if (!settings) {
        throw new Error("Settings not loaded");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distance = calculateDistance(
        userLat,
        userLng,
        settings.gpsLocation.lat,
        settings.gpsLocation.lng
      );

      const locationData = {
        lat: userLat,
        lng: userLng,
        distance: Math.round(distance),
        isValid: distance <= settings.gpsLocation.radius,
        timestamp: new Date().toISOString(),
      };

      setLocation(locationData);

      if (distance <= settings.gpsLocation.radius) {
        setCurrentStep(2);
      } else {
        setLocationError(
          `You are ${Math.round(
            distance
          )}m away from the valid location. Maximum allowed distance is ${
            settings.gpsLocation.radius
          }m.`
        );
      }
    } catch (error) {
      console.error("Location error:", error);
      if (error.code === 1) {
        setLocationError(
          "Location access denied. Please enable location services and try again."
        );
      } else if (error.code === 2) {
        setLocationError(
          "Location unavailable. Please check your GPS settings."
        );
      } else if (error.code === 3) {
        setLocationError("Location request timeout. Please try again.");
      } else {
        setLocationError("Unable to retrieve location. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: One-time location check function for exception modal
  const handleOneTimeLocationCheck = async () => {
    setIsOneTimeLocationLoading(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;
      const distance = calculateDistance(
        userLat,
        userLng,
        settings.gpsLocation.lat,
        settings.gpsLocation.lng
      );

      const locationData = {
        lat: userLat,
        lng: userLng,
        distance: Math.round(distance),
        isValid: distance <= settings.gpsLocation.radius,
        timestamp: new Date().toISOString(),
      };

      // Update exception form with new location data
      setExceptionForm((prev) => ({
        ...prev,
        currentLocation: locationData,
      }));

      setOneTimeLocationSaved(true);
      alert(
        `Location saved! You are ${Math.round(distance)}m from the institution.`
      );
    } catch (error) {
      console.error("One-time location error:", error);
      alert("Unable to get location. Please try again.");
    } finally {
      setIsOneTimeLocationLoading(false);
    }
  };

  const validatePasscode = () => {
    if (!settings) return;
    if (passcode === settings.passcode) {
      setPasscodeError("");
      setCurrentStep(3);
    } else {
      setPasscodeError(
        "Invalid passcode. Please contact your teacher for the correct code."
      );
    }
  };

  const proceedToAttendance = () => {
    onValidationSuccess();
  };

  const submitExceptionRequest = () => {
    setExceptionForm((prev) => ({
      ...prev,
      studentId: user?.email || "",
      studentName: user?.displayName || user?.email || "",
      currentLocation: location
        ? {
            lat: location.lat,
            lng: location.lng,
            distance: location.distance,
            timestamp: location.timestamp,
          }
        : null,
    }));
    setShowExceptionModal(true);
  };

  const handleExceptionSubmit = async () => {
    try {
      const requestData = {
        studentId: exceptionForm.studentId,
        studentName: exceptionForm.studentName,
        reason: exceptionForm.reason,
        details: exceptionForm.details,
        currentLocation: exceptionForm.currentLocation,
        className: "Current Class",
        timestamp: new Date().toISOString(),
        status: "pending",
        type: !timeValid ? "time_window" : "location",
        validationAttempt: {
          timeWindow: settings?.timeWindow,
          locationRequired: settings?.gpsLocation,
          attemptedAt: new Date().toISOString(),
        },
        oneTimeLocationUsed: oneTimeLocationSaved, // NEW: Track if one-time location was used
      };

      const response = await fetch("/api/exceptions/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        setShowExceptionModal(false);
        setOneTimeLocationSaved(false); // Reset for next time
        alert(
          "Exception request submitted successfully. Your teacher will review it."
        );
        setExceptionForm({
          reason: "",
          details: "",
          studentId: "",
          studentName: "",
          currentLocation: null,
        });
      } else {
        alert("Failed to submit request. Please try again.");
      }
    } catch (error) {
      console.error("Exception submission error:", error);
      alert("Error submitting request. Please try again.");
    }
  };

  // Loading and error states remain the same...
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading attendance settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-white">
            Unable to load attendance settings. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  const renderStep1 = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
          <MapPin className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">Location Verification</h2>
        <p className="text-gray-300">
          We need to verify you're at the correct location for attendance
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-4 h-4 rounded-full ${
                timeValid ? "bg-green-500" : "bg-red-500"
              }`}
            ></div>
            <span className="text-white font-semibold">Time Window Check</span>
          </div>
          <p
            className={`text-sm ${
              timeValid ? "text-green-400" : "text-red-400"
            }`}
          >
            {timeValid
              ? `✅ Current time is within allowed window (${settings.timeWindow.start} - ${settings.timeWindow.end})`
              : `❌ Attendance is only allowed between ${settings.timeWindow.start} - ${settings.timeWindow.end}`}
          </p>
        </div>

        {location && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-4 h-4 rounded-full ${
                  location.isValid ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span className="text-white font-semibold">GPS Location</span>
            </div>
            <p
              className={`text-sm ${
                location.isValid ? "text-green-400" : "text-red-400"
              }`}
            >
              {location.isValid
                ? `✅ You are ${location.distance}m from the valid location`
                : `❌ You are ${location.distance}m away (max: ${settings.gpsLocation.radius}m)`}
            </p>
          </div>
        )}

        {locationError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            <p className="text-red-400 text-sm">{locationError}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={requestLocation}
            disabled={isLoading || !timeValid}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Getting Location...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <MapPin className="w-5 h-5" />
                {location ? "Retry Location" : "Get Location"}
              </span>
            )}
          </Button>

          <Button
            onClick={submitExceptionRequest}
            variant="outline"
            className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10 py-4 rounded-2xl"
          >
            Submit Exception Request
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-purple-500/25">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white">Enter Passcode</h2>
        <p className="text-gray-300">
          Please enter the attendance passcode provided by your teacher
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter 6-8 digit passcode"
            className="w-full bg-white/5 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl tracking-widest"
            maxLength={8}
          />

          {passcodeError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <p className="text-red-400 text-sm text-center">
                {passcodeError}
              </p>
            </div>
          )}
        </div>

        <Button
          onClick={validatePasscode}
          disabled={!passcode.trim()}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl shadow-lg"
        >
          Verify Passcode
        </Button>

        <Button
          onClick={() => setCurrentStep(1)}
          variant="outline"
          className="w-full border-gray-500/30 text-gray-400 hover:bg-gray-500/10 py-4 rounded-2xl"
        >
          Back to Location
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/25">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-white">Validation Complete!</h2>
        <p className="text-gray-300">
          All checks passed. You can now proceed to face recognition.
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm">
                ✅ Time window validated
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm">
                ✅ Location verified ({location?.distance}m)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-400 text-sm">
                ✅ Passcode confirmed
              </span>
            </div>
          </div>
        </div>

        <Button
          onClick={proceedToAttendance}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg"
        >
          <span className="flex items-center gap-3">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.5a1.5 1.5 0 011.5 1.5V12a1.5 1.5 0 01-3 0v-1z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10h1.5a1.5 1.5 0 011.5 1.5V12a1.5 1.5 0 01-3 0v-1z"
              />
            </svg>
            Start Face Recognition
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/40 to-slate-900"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

      {/* Header */}
      <div className="text-center mb-12 space-y-6 relative z-10">
        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent drop-shadow-2xl">
            Attendance System
          </h1>
          <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full shadow-lg shadow-purple-500/50"></div>
        </div>
        <p className="text-xl text-gray-300 font-light tracking-wide">
          Multi-Factor Security Validation
        </p>
      </div>

      {/* Progress Steps */}
      <div className="w-full max-w-md mb-8 relative z-10">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  step <= currentStep
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {step}
              </div>
              {step < 3 && (
                <div
                  className={`w-16 h-1 mx-2 transition-all duration-300 ${
                    step < currentStep ? "bg-purple-500" : "bg-gray-700"
                  }`}
                ></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400">
          <span>Location</span>
          <span>Passcode</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-lg bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8 relative z-10">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {/* Register Button */}
      <div className="mt-8 relative z-10">
        <Button
          onClick={() => router.push("/register")}
          variant="outline"
          className="border-purple-400/30 text-purple-400 hover:bg-purple-500/10 px-8 py-3 rounded-2xl backdrop-blur-sm"
        >
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Register New Face
          </span>
        </Button>
      </div>
      {/* Exception Request Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Exception Request
              </h3>
              <p className="text-gray-400">
                Explain why you need attendance exception
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason
                </label>
                <select
                  value={exceptionForm.reason}
                  onChange={(e) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      reason: e.target.value,
                    }))
                  }
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select reason</option>
                  <option value="medical_emergency">Medical Emergency</option>
                  <option value="transport_issue">Transport Issue</option>
                  <option value="family_emergency">Family Emergency</option>
                  <option value="technical_issue">Technical Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Details
                </label>
                <textarea
                  value={exceptionForm.details}
                  onChange={(e) =>
                    setExceptionForm((prev) => ({
                      ...prev,
                      details: e.target.value,
                    }))
                  }
                  placeholder="Provide additional details..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              </div>

              {/* MODIFIED: Location section with one-time check button */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">Current Location</div>
                  {!oneTimeLocationSaved && (
                    <button
                      onClick={handleOneTimeLocationCheck}
                      disabled={isOneTimeLocationLoading}
                      className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1 rounded-md flex items-center gap-1"
                    >
                      {isOneTimeLocationLoading ? (
                        <>
                          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                          Getting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3 h-3" />
                          One Time Check
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="text-white text-sm">
                  {exceptionForm.currentLocation
                    ? `${
                        exceptionForm.currentLocation.distance
                      }m from institution ${
                        oneTimeLocationSaved ? "(Updated)" : ""
                      }`
                    : location
                    ? `${location.distance}m from institution`
                    : "Location not available"}
                </div>
                {oneTimeLocationSaved && (
                  <div className="text-green-400 text-xs mt-1">
                    ✓ Location updated for exception request
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setOneTimeLocationSaved(false); // Reset on cancel
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExceptionSubmit}
                disabled={!exceptionForm.reason.trim()}
                className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl transition-colors"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceValidation;
