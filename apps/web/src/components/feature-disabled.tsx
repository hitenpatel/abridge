"use client";

export function FeatureDisabled({ featureName }: { featureName: string }) {
	return (
		<div className="flex flex-col items-center justify-center py-24 px-6 text-center">
			<span className="material-symbols-rounded text-6xl text-gray-300 mb-4">block</span>
			<h2 className="text-xl font-semibold text-gray-700 mb-2">{featureName} is not enabled</h2>
			<p className="text-gray-500 max-w-md">
				This feature has been disabled for your school. Contact your school administrator if you
				believe this is an error.
			</p>
		</div>
	);
}
