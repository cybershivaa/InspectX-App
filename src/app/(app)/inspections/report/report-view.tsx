
"use client";

import React, { useEffect, useState } from 'react';
import type { InspectionReportFormValues } from './page';
import { format } from 'date-fns';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';

interface ReportViewProps {
  data: InspectionReportFormValues;
  previousInspectionDate?: string | null;
}

const equipmentNameMapping = {
    "ht-motor": "HT Motor",
    "lt-motor": "LT Motor",
    "cable-laying": "Cable Laying/Installation",
    "testing-power-cables": "Testing of Power Cables",
    "cable-trays": "Cable Trays",
    "earthing-system": "Earthing System",
    "ht-lt-switchgear": "HT/LT SwitchGear",
    "lt-panels": "LT Panels",
    "busduct": "Busduct",
    "station-lighting": "Station Lighting",
    "lighting-pole": "Lighting Pole/High Mast/FVI",
    "misc-equipment": "Miscellaneous Equipment/System",
    "ci-equipments": "C&I Equipments/Works",
    "power-transformer": "Power Transformer",
    "outdoor-transformer": "Outdoor Transformer",
    "elevator": "Elevator",
    "turbogenerator": "Turbogenerator",
};

const checklistItemLabels: Record<string, string> = {
    // HT/LT Motor
    installation: "1. Installation of motor on foundation",
    damage: "2. Any damage to the Motor/Mounting Instruments",
    cleanliness: "3. Cleanliness of Motor",
    termination: "4. Termination of Power Cables to Motor",
    earthing: "5. Earthing Connection to the Motor/TBs using Proper Earth Strip",
    rotation: "6. Free Rotation of Motor",
    windingTemp: "7. Winding temperature of Motor",
    testingKitsCalibration: "8. Calibration of Testing kits for motor",
    motorIrPiWr: "9. IR, PI & WR of Motor",
    spaceHeaterIrWr: "10. IR,WR of Space Heater & RTD",
    
    // Cable Laying / Testing Power Cables
    layingOfCable: "1. Laying of cable as per Drawing",
    trefoilFormation: "2. Trefoil formation in Single core Cables",
    dressingOfCables: "3. Dressing of Cables in Trays",
    layingOfDifferentVoltages: "4. Laying of Cables of Different Voltages in Different Trays",
    testingBeforeLaying: "5. Testing of Cables before Laying",
    cableIdentificationTags: "6. Cable Identification Tags",
    bendingRadius: "7. Bending radius of Cables while laying",
    earthingOfSheath: "8. Earthing Of Cable Metalic Seath or Screen",
    calibrationOfTestingKits: "9. Calibration of Testing kits",
    cableIrAndHighVoltageTesting: "10. Cable IR & High Voltage Testing",
    
    // Cable Trays
    layingOfCableTrays: "1. Laying of cable Trays as per Drawing",
    qualificationOfWelders: "2. Qualification of Welders for Tray Works",
    fixingOfCableTraySupports: "3. Fixing of Cable Trays Supports",
    straightnessAlignmentOfCableTray: "4. Straightness/Alignment of Cable Tray Erection",
    alignmentSpacingBetweenTrays: "5. Allignment/Spacing between Parallel Trays",
    tightnessOfCoupler: "6. Tightness of Clamp Coupler/Fish Plates",
    earthingOfTrays: "7. Earthing of Trays",
    trayNumbering: "8. Tray Numbering & Identification",
    cableTrayWeldingJoints: "9. Cable Tray Welding Joints",
    installationOfCableTrays: "10. Installation of Cable Trays",

    // Earthing System
    sizeOfEarthingMaterial: "1. Size/Type of Earthing material",
    layingOfEarthStrip: "2. Laying of Earth Strip",
    weldingOfEarthStrip: "3. Welding of Earth Strip",
    applicationOfProtectivePaint: "4. Application of Protective Paint on Welding",
    preparationOfEarthPit: "5. Preparation of Earth Pit",
    installationOfEarthElectrode: "6. Installation of Earth Electrode",
    connectionOfEarthStrip: "7. Connection of Earth Strip with Earth Electrode",
    preparationOfConcretePit: "8. Preparation of Concrete pit & Cover",
    continuityOfEarthingSystem: "9. Continuity of Earthing System",
    resistanceOfTheEarthElectrode: "10. Resistance of the Earth Electrode",

    // HT/LT Switchgear
    installationOfSwitchgear: "1. Installation of Switchgear as per Drawing",
    cleanlinessOfPanels: "2. Cleanliness of Panels",
    mountingAndAlignment: "3. Mounting & Allignment of Panels",
    connectionOfBusbar: "4. Connection of Busbar between panels",
    earthingOfSwitchgear: "5. Earthing of the Switchgear",
    alignmentOfBusbars: "6. Allignment of Main & Control BusBars",
    unusedHoles: "7. Unused Holes in the bottom of Switchgear",
    conditionOfGaskets: "8. Condition of Gaskets",
    continuityOfMainAndAuxiliaryCircuits: "10. Continuity of Main & Auxilliary Circuits",
    calibrationOfTestingKitsForSwitchgear: "11. Calibration of testing Kits for Switchgear",
    irOfMainAndAuxiliaryBus: "12. IR of Main & Auxilliary/Control Bus",

    // LT Panels
    installationOfPanels: "1. Installation of Panels as per Drawing",
    markingAndDesignationOfPanels: "3. Marking/Designation of Panels",
    earthingOfPanels: "5. Earthing of the Panels",
    useOfCableGlands: "6. Use of Cable Glands",

    // Busduct
    layingOfBusduct: "1. Laying of Busduct as per Drawing",
    cleaningOfBusducts: "2. Cleaning of the busducts",
    fixingOfFishPlates: "3. Fixing of Fish Plates/Rubber Bellow",
    fixingOfSupportStructure: "4. Fixing of Support Structure",
    earthingOfTheBusduct: "5. Earthing of the Busduct",
    spaceHeater: "6. Space Heater/Breather of the busduct",
    calibrationOfTestingKitsForBusduct: "7. Calibration of Tetsing Kits for Busduct",
    irAndHvOfBusduct: "8. IR & HV of Busduct",

    // Station Lighting
    mountingOfLightingFixtures: "1. Mounting/Allignment of Lighting Fixtures",
    mountingOfLightingPanel: "2. Mounting/Bolting & Earthing of Lighting Panel/SwitchBoxes",
    designationOfLighting: "3. Designation of Lighting Panel/Switch Box/Fixtures",
    markingInAcEmergency: "4. Marking in the AC Emergency Lighting System",
    cablesEntryInLightingPanel: "5. Cables/Wires Entry in Lighting Panel",
    layingAndMarkingOfConduits: "6. Laying & Marking of Conduits",
    pullOutBoxes: "7. Pull Out Boxes for Long Conduits",
    wiringOfLightingFixtures: "8. Wiring of the Lighting Fixtures",
    separateWiringForReceptacles: "9. Seperate wiring for Receptacles",
    earthingOfConduits: "10. Earthing of Conduits",
    wiringInConduits: "11. Wiring in the conduits",
    wiringInBatteryRoom: "12. Wiring in the Battery Room/WTP Area",
    irOfLightingSystem: "13. IR of Fixture/Panel/Wires/Cables",

    // Lighting Poles
    readinessOfCivilFoundation: "1. Readiness of civil foundation",
    mountingOfPoles: "2. Mounting/Allignment of Poles",
    earthingOfPoles: "3. Eathing of Poles",
    cableEntryUnderPole: "4. Cable Entry under Pole/Mast",
    dressingOfPoleCables: "5. Dressing of Cables",
    numberingOfPoles: "6. Numbering/Identification of Poles",
    lanternCarriageFunction: "7. Lantern Carriage function of High Mast",
    testingOfHighMastCablesMotor: "8. Testing of Cables (& Motor in case of High Mast)",
};

const detailedAcceptanceCriteria: Record<string, string> = {
    // Cable Laying
    layingOfCable: "1. Cable should be laid as per Appd drawing/Cable Schedule. 2. Drawing should be available at site. 3. Some Extra length cable to be laid",
    trefoilFormation: "Trefoil Clamp should be provided on every 1 Meter in Vertical trays & Every 2 Meter in Horizontal tray.",
    dressingOfCables: "1. Cables to be fixed by Nylon tyes in both Vertical & Horizontal Trays. 2. Use of GI Wire for Fixing of cables to be avoided.",
    layingOfDifferentVoltages: "HT Cables are to be laid in top most tier & Subsequent lower Voltages Cables in lower tiers of cable tray racks.",
    testingBeforeLaying: "1. IR test to be done of Cables in the cable drums. 2. Document to be checked & verified on site. 3. Minimum IR value will be (KV+1) Mega Ohm.",
    cableIdentificationTags: "Cable Tags to be provided on: 1. Both Ends 2. On Every 25 Meter in Straight Run 3. On every Bends & At Both Ends of the Road/Wall Crossings",
    bendingRadius: "Bending radius should be maintained as per standards.",
    earthingOfSheath: "HT Cables to be earthed on both ends & LT Cables to be earthed atleast one End.",
    calibrationOfTestingKits: "1. All Testing Kits should have valid Calibration Certificate. 2. Certificate to be Verified before Testing.",
    cableIrAndHighVoltageTesting: "1. IR Tested as per Standards KV+1 Mega ohm at 1000V DC. 2. Voltage Test at 80% of rated voltage of Cable for 1 Minute.",
};


const ReportField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value && value !== "") return null;
    return (
        <div className="break-inside-avoid">
            <p className="text-xs font-semibold text-black uppercase tracking-wider">{label}</p>
            <p className="text-sm text-gray-700 break-words">{value || "--"}</p>
        </div>
    );
};

const ChecklistItemView = ({ name, result, index }: { name: string; result?: { result: string; remarks?: string; imagePath?: string; }; index: number }) => {
    const label = checklistItemLabels[name] || name;
    // Remove existing numbering from label
    const cleanLabel = label.replace(/^\d+\.\s*/, '');
    const acceptanceCriteria = detailedAcceptanceCriteria[name];
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (result?.imagePath) {
            const fetchUrl = async () => {
                try {
                    const url = await getDownloadURL(ref(storage, result.imagePath));
                    setImageUrl(url);
                } catch (error) {
                    console.error("Failed to get image download URL", error);
                }
            };
            fetchUrl();
        }
    }, [result?.imagePath]);

    if (!result) return null;

    return (
        <div className="mb-6 break-inside-avoid">
            <h3 className="text-base font-bold text-black mb-2">{index}. {cleanLabel}</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm font-bold text-black mb-1">Acceptance Criteria:</p>
                    <p className="text-sm italic text-gray-700">
                        {acceptanceCriteria || result.remarks || 'Standard compliance required'}
                    </p>
                </div>
                
                <div>
                    <p className="text-sm font-bold text-black mb-1">Actual Condition/Result</p>
                    <p className={`text-sm font-semibold ${result.result === 'OK' ? 'text-green-700' : 'text-red-700'}`}>
                        {result.result}
                    </p>
                </div>
            </div>
            
            {imageUrl && (
                <div className="mt-3 pl-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Attached Image:</p>
                    <Image 
                        src={imageUrl} 
                        alt={`Image for ${cleanLabel}`}
                        width={200} 
                        height={200} 
                        className="rounded-md object-contain border"
                        crossOrigin="anonymous"
                    />
                </div>
            )}
        </div>
    );
}

function ReportFileView({ label, path }: { label: string, path?: string}) {
    const [fileUrl, setFileUrl] = useState<string | null>(null);

    useEffect(() => {
        if (path) {
            const fetchUrl = async () => {
                try {
                    const url = await getDownloadURL(ref(storage, path));
                    setFileUrl(url);
                } catch (error) {
                    console.error("Failed to get file download URL", error);
                    setFileUrl('#');
                }
            };
            fetchUrl();
        }
    }, [path]);

    if (!path) return null;

    return (
        <div className="break-inside-avoid">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
            {fileUrl ? (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                    View Uploaded File
                </a>
            ) : (
                 <p className="text-sm text-gray-800 break-words">Generating file link...</p>
            )}
        </div>
    )
}

function DeviationView({ deviation, index }: { deviation: { deviations?: string, rectification?: string, imagePath?: string}, index: number }) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (deviation.imagePath) {
            const fetchUrl = async () => {
                try {
                    const url = await getDownloadURL(ref(storage, deviation.imagePath));
                    setImageUrl(url);
                } catch (error) {
                    console.error("Failed to get image download URL", error);
                }
            };
            fetchUrl();
        }
    }, [deviation.imagePath]);
    
    return (
        <div className="p-3 border-t mt-3 space-y-2 break-inside-avoid">
           <h4 className='font-medium text-gray-600'>Deviation #{index + 1}</h4>
           <ReportField label="Deviations/Issues Found" value={deviation.deviations} />
           <ReportField label="Proposed Rectification" value={deviation.rectification} />
           {imageUrl && (
                <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-500 mb-2">Attached Image:</p>
                    <Image 
                        src={imageUrl} 
                        alt={`Image for deviation ${index + 1}`}
                        width={200} 
                        height={200} 
                        className="rounded-md object-contain border"
                        crossOrigin="anonymous"
                     />
                </div>
            )}
        </div>
    )
}

export function ReportView({ data, previousInspectionDate }: ReportViewProps) {
  const checklistItems = Object.entries(data).filter(([key]) => checklistItemLabels[key] && data[key as keyof typeof data]);

  return (
    <div className="bg-white text-gray-900 font-sans">
      <style>{`
          .break-inside-avoid { page-break-inside: avoid; }
          .break-after-page { page-break-after: always; }
          .break-before-page { page-break-before: always; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
      `}</style>
      <div className="p-8 space-y-6">
        <header className="break-inside-avoid">
          {/* Top Section - Cyan Background */}
          <div className="text-center py-4 mb-6" style={{ backgroundColor: '#B8E6E6' }}>
            <h1 className="text-2xl font-bold text-gray-900">NTPC BARH FQA</h1>
            <p className="text-sm text-gray-900 mt-1">Electrical/C&I Surveillance Checks</p>
          </div>

          {/* Complete Header Image - Logos and Titles */}
          <div className="w-full mb-4">
            <img 
              src="/ntpc-header.png" 
              alt="NTPC BARH FQA Header" 
              className="w-full h-auto"
              style={{ maxWidth: '100%', display: 'block', margin: '0 auto' }}
            />
          </div>

          {/* Bottom Section - Subtitle with Underline */}
          <div className="text-center mb-6">
            <span 
              className="text-base font-bold inline-block" 
              style={{ 
                borderBottom: '2px solid #000', 
                paddingBottom: '4px'
              }}
            >
              Electrical/C&I Surveillance Checks
            </span>
          </div>
        </header>

        <section className="break-after-page">
            <h2 className="text-xl font-bold mb-4 text-black">Basic Details</h2>
            
            {/* First Row */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-black">Name of the Agency</p>
                <p className="text-sm text-gray-700">{data.agencyName || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Area Details</p>
                <p className="text-sm text-gray-700">{data.areaDetails || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Unit No</p>
                <p className="text-sm text-gray-700">{data.unitNo || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Date of Inspection</p>
                <p className="text-sm text-gray-700">{data.inspectionDate ? format(new Date(data.inspectionDate), 'dd-MM-yyyy') : '--'}</p>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-black">Equipment Details</p>
                <p className="text-sm text-gray-700">{data.equipmentDetails || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Type of Check</p>
                <p className="text-sm text-gray-700">{data.checkType || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Equipment Name</p>
                <p className="text-sm text-gray-700">{data.equipmentName?.map(id => equipmentNameMapping[id as keyof typeof equipmentNameMapping] || id).join(', ') || '--'}</p>
              </div>
              <div>
                <p className="text-sm font-bold text-black">Previous Inspection Date</p>
                <p className="text-sm text-gray-700">{previousInspectionDate ? format(new Date(previousInspectionDate), 'dd-MM-yyyy') : 'First Inspection'}</p>
              </div>
            </div>

            {/* Third Row */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <p className="text-sm font-bold text-black">Report No:</p>
                <p className="text-sm text-gray-700">{data.reportNo || '--'}</p>
              </div>
            </div>

            {/* Additional Info Below */}
            <div className="mt-6 pt-4 border-t border-gray-300">
              <div className="grid grid-cols-3 gap-4">
                <ReportField label="Equipment/Machine SL No" value={data.machineSlNo} />
                <ReportField label="Inspection Call Raised By" value={data.requestedBy} />
                <ReportField label="Inspection Performed By" value={data.inspectedBy} />
              </div>
              {(data.ambientTemp || data.relativeHumidity) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {data.ambientTemp && <ReportField label="Ambient Temp" value={data.ambientTemp} />}
                  {data.relativeHumidity && <ReportField label="Relative Humidity" value={data.relativeHumidity} />}
                </div>
              )}
            </div>
        </section>
        
        {checklistItems.length > 0 && (
            <section className="break-before-page">
                {/* Horizontal Line Above Checklist Results */}
                <div className="border-t-2 border-black mb-6"></div>
                <h2 className="text-xl font-bold mb-6 text-black">
                    Checks for {data.equipmentName?.map(id => equipmentNameMapping[id as keyof typeof equipmentNameMapping] || id).join(', ')} 
                    {data.equipmentDetails && ` (${data.equipmentDetails})`}
                </h2>
                
                <div className="space-y-4">
                    {checklistItems.map(([key], index) => (
                        <ChecklistItemView key={key} name={key} result={data[key as keyof typeof data] as any} index={index + 1} />
                    ))}
                </div>
            </section>
        )}


        {data.miscInspections && data.miscInspections.length > 0 && data.miscInspections[0]?.location && (
            <section className="break-before-page">
                <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">4. Miscellaneous Inspections</h2>
                {data.miscInspections.map((insp, index) => (
                    <div key={index} className="p-4 border rounded-md space-y-3 mb-4 break-inside-avoid">
                        <h3 className="font-semibold text-md text-gray-800">Inspection Area #{index + 1}</h3>
                        <ReportField label="Location" value={insp.location} />
                        <ReportField label="System/Equipment Name" value={insp.systemName} />
                        {insp.deviations.map((dev, dIndex) => (
                             <DeviationView key={dIndex} deviation={dev} index={dIndex} />
                        ))}
                    </div>
                ))}
            </section>
        )}
        
        {data.powerTransformerInspections && data.powerTransformerInspections.length > 0 && data.powerTransformerInspections[0]?.location && (
            <section className="break-before-page">
                <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">4. Power Equipment Inspections</h2>
                {data.powerTransformerInspections.map((insp, index) => (
                    <div key={index} className="p-4 border rounded-md space-y-3 mb-4 break-inside-avoid">
                        <h3 className="font-semibold text-md text-gray-800">Inspection Area #{index + 1}</h3>
                        <ReportField label="Location" value={insp.location} />
                        <ReportField label="System/Equipment Name" value={insp.systemName} />
                        <ReportField label="Inspection/Test Details" value={insp.inspectionTestDetails} />
                        <ReportField label="Deviations / Pending Points" value={insp.deviationsPendingPoints} />
                         <ReportFileView label="Uploaded Test Report" path={insp.testReportsPath} />
                        {insp.deviations.map((dev, dIndex) => (
                             <DeviationView key={dIndex} deviation={dev} index={dIndex} />
                        ))}
                    </div>
                ))}
            </section>
        )}
        
        <section className="break-before-page">
            <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-gray-700">5. Final Remarks</h2>
            <ReportField label="Other Remarks" value={data.otherRemarks} />
             <ReportFileView label="Uploaded Test Report" path={data.reportUrl} />
        </section>
        
        <section className="pt-10 break-inside-avoid">
            <h2 className="text-lg font-semibold text-center mb-8 text-gray-700">6. Signatures</h2>
            <div className="grid grid-cols-3 gap-8">
                <div className="text-center space-y-2">
                    <div className="border-b border-gray-400 h-20"></div>
                    <p className="text-sm font-semibold">{data.signatureContractor?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 uppercase">For Contractor/Sub-Contractor</p>
                </div>
                <div className="text-center space-y-2">
                    <div className="border-b border-gray-400 h-20"></div>
                    <p className="text-sm font-semibold">{data.signatureNTPCErection?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 uppercase">For NTPC Erection</p>
                </div>
                <div className="text-center space-y-2">
                    <div className="border-b border-gray-400 h-20"></div>
                    <p className="text-sm font-semibold">{data.signatureNTPCFQA?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500 uppercase">For NTPC FQA</p>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
}
