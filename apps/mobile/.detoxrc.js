/** @type {Detox.DetoxConfig} */
module.exports = {
	testRunner: {
		args: {
			$0: "jest",
			config: "e2e/jest.config.js",
		},
		jest: {
			setupTimeout: 120000,
		},
	},

	apps: {
		"android.debug": {
			type: "android.apk",
			binaryPath: "android/app/build/outputs/apk/debug/app-debug.apk",
			testBinaryPath: "android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk",
			build:
				"cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..",
			reversePorts: [4000, 8081],
		},
		"android.release": {
			type: "android.apk",
			binaryPath: "android/app/build/outputs/apk/release/app-release.apk",
			testBinaryPath:
				"android/app/build/outputs/apk/androidTest/release/app-release-androidTest.apk",
			build:
				"cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..",
		},
	},

	devices: {
		emulator: {
			type: "android.emulator",
			device: {
				avdName: "Pixel_7_API_34",
			},
		},
		"ci.emulator": {
			type: "android.emulator",
			device: {
				avdName: "test",
			},
		},
		attached: {
			type: "android.attached",
			device: {
				adbName: ".*",
			},
		},
	},

	configurations: {
		"android.emu.debug": {
			device: "emulator",
			app: "android.debug",
		},
		"android.emu.release": {
			device: "emulator",
			app: "android.release",
		},
		"android.ci.debug": {
			device: "ci.emulator",
			app: "android.debug",
		},
		"android.att.debug": {
			device: "attached",
			app: "android.debug",
		},
		"android.att.release": {
			device: "attached",
			app: "android.release",
		},
	},
};
