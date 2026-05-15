import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { assertFirebaseConfigured, db, functions, storage } from "@/firebase/config";
import { reportSchema } from "@/lib/validation";
import type { CreateReportInput, ItemReport } from "@/types/domain";

type SnapshotHandler<T> = (items: T[]) => void;

export function subscribeToUserReports(uid: string, onData: SnapshotHandler<ItemReport>, onError: (error: Error) => void) {
  const reportsQuery = query(collection(db, "reports"), where("ownerUid", "==", uid), orderBy("createdAt", "desc"));
  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as ItemReport));
    },
    onError,
  );
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

export async function createReport(uid: string, input: CreateReportInput): Promise<string> {
  assertFirebaseConfigured();
  const values = reportSchema.parse(input);
  const reportRef = doc(collection(db, "reports"));
  const photoUrls: string[] = [];
  const photoStoragePaths: string[] = [];

  for (const [index, uri] of values.photoUris.entries()) {
    const blob = await uriToBlob(uri);
    const storagePath = `report-photos/${uid}/${reportRef.id}/${Date.now()}-${index}.jpg`;
    const photoRef = ref(storage, storagePath);
    await uploadBytes(photoRef, blob, { contentType: "image/jpeg" });
    photoStoragePaths.push(storagePath);
    photoUrls.push(await getDownloadURL(photoRef));
  }

  await setDoc(reportRef, {
    type: values.type,
    ownerUid: uid,
    title: values.title,
    description: values.description,
    category: values.category ?? null,
    locationText: values.locationText,
    campusZone: values.campusZone ?? null,
    eventDate: values.eventDate ? Timestamp.fromDate(values.eventDate) : null,
    photoUrls,
    photoStoragePaths,
    status: "open",
    aiProcessingStatus: "pending",
    aiProcessingError: null,
    visibility: "public_matchable",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
  });

  return reportRef.id;
}

export async function markReportResolved(reportId: string) {
  assertFirebaseConfigured();
  const callable = httpsCallable<{ reportId: string }, { ok: boolean }>(functions, "markReportResolved");
  await callable({ reportId });
}

export async function rerunMatchingForReport(reportId: string) {
  assertFirebaseConfigured();
  const callable = httpsCallable<{ reportId: string }, { ok: boolean }>(functions, "rerunMatchingForReport");
  await callable({ reportId });
}

export async function seedDemoReports(uid: string) {
  const samples: Omit<CreateReportInput, "photoUris">[] = [
    {
      type: "lost",
      title: "Black leather wallet",
      category: "Wallet",
      description: "Lost a black leather wallet near the main library. It has student cards and a small silver zipper.",
      locationText: "Main Library",
      campusZone: "Main Library",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Blue Dell XPS 15 laptop",
      category: "Laptop",
      description: "Blue Dell XPS 15 laptop with a GUtech sticker on the lid and a small scratch near the left corner.",
      locationText: "Main Library second floor",
      campusZone: "Main Library",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "White iPhone 14 with clear case",
      category: "Phone",
      description: "White iPhone 14 in a clear case with a faded campus card tucked behind the phone.",
      locationText: "Engineering Building lobby",
      campusZone: "Engineering Building",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Silver MacBook Air",
      category: "Laptop",
      description: "Silver MacBook Air with a small coffee stain mark on the lower right palm rest and no charger.",
      locationText: "Cafeteria seating area",
      campusZone: "Cafeteria",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Toyota car keys with red tag",
      category: "Keys",
      description: "Toyota key fob attached to two silver keys and a red plastic tag from a gym locker.",
      locationText: "Sports hall entrance",
      campusZone: "Sports Hall",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Blue Hydro Flask bottle",
      category: "Other",
      description: "Matte blue Hydro Flask water bottle with dents near the bottom and a black cap.",
      locationText: "Gym changing room",
      campusZone: "Sports Hall",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Black Samsung earbuds case",
      category: "Other",
      description: "Black Samsung Galaxy Buds case with only the right earbud inside and a tiny white scratch on top.",
      locationText: "Lecture Hall A",
      campusZone: "Lecture Halls",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Green notebook for calculus",
      category: "Book",
      description: "Green spiral notebook labeled Calculus II with handwritten notes and a blue pen clipped to the cover.",
      locationText: "Math classroom 204",
      campusZone: "Academic Block",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Student ID card in black lanyard",
      category: "ID Card",
      description: "Student ID card inside a transparent holder attached to a plain black lanyard.",
      locationText: "Main gate security desk",
      campusZone: "Main Gate",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "HP laptop charger",
      category: "Charger",
      description: "Black HP laptop charger with a round blue tip and tape wrapped near the adapter cable.",
      locationText: "Computer lab 3",
      campusZone: "Computer Labs",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Pink pencil case",
      category: "Other",
      description: "Soft pink pencil case with highlighters, a USB drive, and a small cartoon keychain attached.",
      locationText: "Design studio",
      campusZone: "Design Studio",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Black Casio calculator",
      category: "Other",
      description: "Black Casio scientific calculator with the name A.O. written in silver marker on the back.",
      locationText: "Exam hall B",
      campusZone: "Exam Halls",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Brown leather card holder",
      category: "Wallet",
      description: "Small brown leather card holder containing bank cards and a university access card.",
      locationText: "Library cafe counter",
      campusZone: "Main Library",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Black backpack with laptop sleeve",
      category: "Other",
      description: "Black Nike backpack with a laptop sleeve, a grey hoodie inside, and a broken front zipper pull.",
      locationText: "Bus stop near main gate",
      campusZone: "Main Gate",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Apple Watch with navy strap",
      category: "Other",
      description: "Apple Watch with a navy silicone strap and a small crack on the screen protector.",
      locationText: "Outdoor seating near cafeteria",
      campusZone: "Cafeteria",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Red thermos flask",
      category: "Other",
      description: "Red metal thermos flask with a silver lid and a sticker from Muscat on the side.",
      locationText: "Student lounge",
      campusZone: "Student Lounge",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Grey Lenovo laptop sleeve",
      category: "Other",
      description: "Grey Lenovo laptop sleeve with a zipper pocket containing printed lab sheets.",
      locationText: "Physics lab",
      campusZone: "Science Labs",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Purple umbrella",
      category: "Other",
      description: "Compact purple umbrella with a curved black handle and a torn strap.",
      locationText: "Administration building reception",
      campusZone: "Administration",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "Black Android phone",
      category: "Phone",
      description: "Black Android phone with a cracked top-left screen protector and a dark green case.",
      locationText: "Parking lot B",
      campusZone: "Parking",
      eventDate: new Date(),
    },
    {
      type: "lost",
      title: "White USB-C charger",
      category: "Charger",
      description: "White USB-C wall charger with a braided white cable and initials written near the plug.",
      locationText: "Seminar room 102",
      campusZone: "Academic Block",
      eventDate: new Date(),
    },
  ];

  for (const [index, sample] of samples.entries()) {
    const reportRef = doc(collection(db, "reports"), `demo-lost-${uid}-${String(index + 1).padStart(2, "0")}`);
    await setDoc(reportRef, {
      ...sample,
      ownerUid: uid,
      photoUrls: [],
      photoStoragePaths: [],
      status: "open",
      aiProcessingStatus: "pending",
      aiProcessingError: null,
      visibility: "public_matchable",
      eventDate: sample.eventDate ? Timestamp.fromDate(sample.eventDate) : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      resolvedAt: null,
    }, { merge: true });
  }
}
